// ============================================
// 1. EMAIL RETRY LOGIC (lib/email-retry.ts)
// ============================================
import { supabaseAdmin } from './supabase';

interface RetryConfig {
  maxRetries: number;
  retryDelays: number[]; // in hours
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelays: [24, 72, 168] // 1 day, 3 days, 7 days
};

export async function scheduleEmailRetry(
  failedPaymentId: string,
  retryNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
) {
  if (retryNumber >= config.maxRetries) {
    console.log(`Max retries reached for payment ${failedPaymentId}`);
    return;
  }

  const delayHours = config.retryDelays[retryNumber];
  const sendAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

  // Store scheduled retry in database
  await supabaseAdmin.from('email_retries').insert({
    failed_payment_id: failedPaymentId,
    retry_number: retryNumber,
    scheduled_at: sendAt.toISOString(),
    status: 'pending'
  });

  console.log(`Scheduled retry ${retryNumber} for ${failedPaymentId} at ${sendAt}`);
}
