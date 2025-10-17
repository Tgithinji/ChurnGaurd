-- ============================================
-- 1. DATABASE SCHEMA (schema.sql)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creators table (extends Supabase auth.users)
CREATE TABLE public.creators (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Failed payments table
CREATE TABLE public.failed_payments (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recovered_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(stripe_invoice_id, creator_id)
);

-- Recovered payments table
CREATE TABLE public.recovered_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    failed_payment_id UUID NOT NULL REFERENCES public.failed_payments(id) ON DELETE CASCADE,
    recovered_amount DECIMAL(10,2) NOT NULL,
    stripe_payment_intent_id TEXT,
    recovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator settings table
CREATE TABLE public.creator_settings (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_failed_payments_creator ON public.failed_payments(creator_id);
CREATE INDEX idx_failed_payments_status ON public.failed_payments(status);
CREATE INDEX idx_failed_payments_created ON public.failed_payments(created_at DESC);
CREATE INDEX idx_recovered_payments_failed ON public.recovered_payments(failed_payment_id);

-- Row Level Security (RLS)
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovered_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON public.creators FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own payments" ON public.failed_payments FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Users can view own recovered" ON public.recovered_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.failed_payments WHERE id = failed_payment_id AND creator_id = auth.uid())
);
CREATE POLICY "Users can view own settings" ON public.creator_settings FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Users can update own settings" ON public.creator_settings FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can insert own settings" ON public.creator_settings FOR INSERT WITH CHECK (auth.uid() = creator_id);
