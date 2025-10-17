// ============================================
// 10. WEBHOOK LOGGING (lib/webhook-logger.ts)
// ============================================
import { supabaseAdmin } from './supabase';

export interface WebhookLog {
  id: string;
  event_type: string;
  stripe_event_id: string;
  payload: unknown;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  processed_at: Date;
  creator_id?: string;
}

export async function logWebhookEvent(
  eventType: string,
  stripeEventId: string,
  payload: unknown,
  status: 'success' | 'failed',
  errorMessage?: string,
  creatorId?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      event_type: eventType,
      stripe_event_id: stripeEventId,
      payload,
      status,
      error_message: errorMessage,
      creator_id: creatorId,
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}
