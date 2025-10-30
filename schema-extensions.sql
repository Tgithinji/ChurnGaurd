-- ============================================
-- 🚀 CHURNGUARD MULTI-USER DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE OR UPDATE TABLES
-- ============================================

-- Creators table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed payments
CREATE TABLE IF NOT EXISTS public.failed_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_invoice_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('failed', 'recovered')) DEFAULT 'failed',
  invoice_url TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recovered_at TIMESTAMPTZ,
  UNIQUE(stripe_invoice_id, creator_id)
);

-- Recovered payments
CREATE TABLE IF NOT EXISTS public.recovered_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  failed_payment_id UUID NOT NULL REFERENCES public.failed_payments(id) ON DELETE CASCADE,
  recovered_amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  recovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator settings
CREATE TABLE IF NOT EXISTS public.creator_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  stripe_api_key TEXT,
  stripe_webhook_secret TEXT,
  webhook_url TEXT,
  email_subject TEXT DEFAULT 'Hey {name}, please update your card to keep your subscription active 💳',
  email_body TEXT DEFAULT 'Hi {name},

We noticed that your recent payment for {product_name} ({amount}) didn''t go through. Don''t worry - this happens sometimes!

To keep your subscription active, please update your payment method here:
{payment_update_link}

If you have any questions, just reply to this email.

Thanks,
The Team',
  resend_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================
DROP INDEX IF EXISTS idx_failed_payments_creator;
DROP INDEX IF EXISTS idx_failed_payments_status;
DROP INDEX IF EXISTS idx_failed_payments_created;
DROP INDEX IF EXISTS idx_failed_payments_composite;
DROP INDEX IF EXISTS idx_recovered_payments_failed;

CREATE INDEX idx_failed_payments_creator ON public.failed_payments (creator_id);
CREATE INDEX idx_failed_payments_status ON public.failed_payments (status);
CREATE INDEX idx_failed_payments_created ON public.failed_payments (created_at DESC);
CREATE INDEX idx_failed_payments_composite ON public.failed_payments (creator_id, status, created_at DESC);
CREATE INDEX idx_recovered_payments_failed ON public.recovered_payments (failed_payment_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. DROP OLD POLICIES
-- ============================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- 6. CREATE NEW POLICIES
-- ============================================

-- Creators
CREATE POLICY "Users can view own data"
  ON public.creators
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.creators
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.creators
  FOR UPDATE
  USING (auth.uid() = id);

-- Failed payments
CREATE POLICY "Users can view own payments"
  ON public.failed_payments
  FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own payments"
  ON public.failed_payments
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own payments"
  ON public.failed_payments
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- Recovered payments
CREATE POLICY "Users can view own recovered"
  ON public.recovered_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.failed_payments fp
      WHERE fp.id = failed_payment_id
      AND fp.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recovered"
  ON public.recovered_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.failed_payments fp
      WHERE fp.id = failed_payment_id
      AND fp.creator_id = auth.uid()
    )
  );

-- Creator settings
CREATE POLICY "Users can view own settings"
  ON public.creator_settings
  FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own settings"
  ON public.creator_settings
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own settings"
  ON public.creator_settings
  FOR UPDATE
  USING (auth.uid() = creator_id);

-- ============================================
-- 7. TRIGGER: AUTO-CREATE CREATOR PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.creators (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.creator_settings (creator_id, webhook_url)
  VALUES (
    NEW.id,
    COALESCE(current_setting('app.site_url', true), 'https://your-app.vercel.app') || '/api/webhooks/stripe'
  )
  ON CONFLICT (creator_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. VERIFY MIGRATION
-- ============================================
DO $$
DECLARE
  table_count INT;
  policy_count INT;
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('creators', 'failed_payments', 'recovered_payments', 'creator_settings');

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created';

  RAISE NOTICE '✅ Migration Summary:';
  RAISE NOTICE '   Tables: %', table_count;
  RAISE NOTICE '   Policies: %', policy_count;
  RAISE NOTICE '   Triggers: %', trigger_count;

  IF table_count = 4 AND policy_count >= 11 AND trigger_count = 1 THEN
    RAISE NOTICE '🎉 Migration completed successfully!';
  ELSE
    RAISE WARNING '⚠️ Some components may be missing. Please review logs.';
  END IF;
END $$;
