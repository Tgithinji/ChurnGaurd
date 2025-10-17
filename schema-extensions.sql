-- ============================================
-- 19. ADDITIONAL DATABASE TABLES (schema-extensions.sql)
-- ============================================

-- Email retry tracking
CREATE TABLE public.email_retries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    failed_payment_id UUID NOT NULL REFERENCES public.failed_payments(id) ON DELETE CASCADE,
    retry_number INTEGER NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logging
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    stripe_event_id TEXT NOT NULL,
    payload JSONB,
    status TEXT CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
    error_message TEXT,
    creator_id UUID REFERENCES public.creators(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment method updates
CREATE TABLE public.payment_method_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_customer_id TEXT NOT NULL,
    old_payment_method TEXT,
    new_payment_method TEXT,
    triggered_by_email BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test results
CREATE TABLE public.ab_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    recovered BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_retries_status ON public.email_retries(status, scheduled_at);
CREATE INDEX idx_webhook_logs_event ON public.webhook_logs(event_type, created_at DESC);
CREATE INDEX idx_webhook_logs_creator ON public.webhook_logs(creator_id);
CREATE INDEX idx_payment_updates_customer ON public.payment_method_updates(stripe_customer_id);
CREATE INDEX idx_ab_results_variant ON public.ab_test_results(variant_id);
