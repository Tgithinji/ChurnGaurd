// ============================================
// 3. WEBHOOK VALIDATION (lib/webhook-validator.ts)
// ============================================
import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export class WebhookValidator {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, { apiVersion: '2024-04-10' });
  }

  async validateAndParse(
    req: NextRequest,
    webhookSecret: string
  ): Promise<{ valid: boolean; event?: Stripe.Event; error?: string }> {
    try {
      const body = await req.text();
      const signature = req.headers.get('stripe-signature');

      if (!signature) {
        return { valid: false, error: 'No signature header' };
      }

      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );

      return { valid: true, event };
    } catch (err: unknown) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  isRelevantEvent(event: Stripe.Event): boolean {
    const relevantEvents = [
      'invoice.payment_failed',
      'invoice.payment_succeeded',
      'customer.subscription.deleted',
      'customer.subscription.updated'
    ];
    return relevantEvents.includes(event.type);
  }
}