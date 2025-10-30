// ============================================
// SUPABASE DATABASE TYPES
// ============================================
import { 
  FailedPayment, 
  CreatorSettings, 
  EmailRetry, 
  Creator, 
  RecoveredPayment, 
  WebhookLog, 
  PaymentMethodUpdate, 
  ABTestResult 
} from './database';

export interface Database {
  public: {
    Tables: {
      creators: {
        Row: Creator;
        Insert: Omit<Creator, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Creator, 'id' | 'created_at' | 'updated_at'>>;
      };
      failed_payments: {
        Row: FailedPayment;
        Insert: Omit<FailedPayment, 'id' | 'created_at'>;
        Update: Partial<Omit<FailedPayment, 'id' | 'created_at'>>;
      };
      creator_settings: {
        Row: CreatorSettings;
        Insert: Omit<CreatorSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CreatorSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
      email_retries: {
        Row: EmailRetry;
        Insert: Omit<EmailRetry, 'id' | 'created_at' | 'failed_payment'>;
        Update: Partial<Omit<EmailRetry, 'id' | 'created_at' | 'failed_payment'>>;
      };
      recovered_payments: {
        Row: RecoveredPayment;
        Insert: Omit<RecoveredPayment, 'id' | 'recovered_at'>;
        Update: Partial<Omit<RecoveredPayment, 'id' | 'recovered_at'>>;
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: Omit<WebhookLog, 'id' | 'created_at'>;
        Update: Partial<Omit<WebhookLog, 'id' | 'created_at'>>;
      };
      payment_method_updates: {
        Row: PaymentMethodUpdate;
        Insert: Omit<PaymentMethodUpdate, 'id' | 'created_at'>;
        Update: Partial<Omit<PaymentMethodUpdate, 'id' | 'created_at'>>;
      };
      ab_test_results: {
        Row: ABTestResult;
        Insert: Omit<ABTestResult, 'id' | 'created_at'>;
        Update: Partial<Omit<ABTestResult, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
