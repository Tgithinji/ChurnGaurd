// ============================================
// 11. PAYMENT METHOD UPDATE TRACKING (lib/payment-tracking.ts)
// ============================================
import { supabaseAdmin } from './supabase';

export interface PaymentMethodUpdate {
  customerId: string;
  oldPaymentMethod: string;
  newPaymentMethod: string;
  updatedAt: Date;
  triggeredByEmail: boolean;
}

export async function trackPaymentMethodUpdate(
  customerId: string,
  oldMethod: string,
  newMethod: string,
  triggeredByEmail: boolean = false
): Promise<void> {
  await supabaseAdmin.from('payment_method_updates').insert({
    stripe_customer_id: customerId,
    old_payment_method: oldMethod,
    new_payment_method: newMethod,
    updated_at: new Date().toISOString(),
    triggered_by_email: triggeredByEmail
  } as any);
}