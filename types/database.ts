// ============================================
// 3. TYPE DEFINITIONS (types/database.ts)
// ============================================
export interface FailedPayment {
  id: string;
  creator_id: string;
  stripe_customer_id: string;
  stripe_invoice_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount: number;
  currency: string;
  status: 'failed' | 'recovered';
  invoice_url?: string;
  payment_intent_id?: string;
  created_at: string;
  recovered_at?: string;
}

export interface CreatorSettings {
  id: string;
  creator_id: string;
  stripe_api_key?: string;
  stripe_webhook_secret?: string;
  webhook_url?: string;
  email_subject: string;
  email_body: string;
  resend_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailRetry {
  id: string;
  failed_payment_id: string;
  retry_number: number;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
  failed_payment: FailedPayment;
}
