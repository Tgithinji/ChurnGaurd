// ============================================
// 7. STRIPE WEBHOOK HANDLER (app/api/webhooks/stripe/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPaymentFailedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Get customer details
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        ) as Stripe.Customer;

        // Get product name from line items
        const productName = invoice.lines.data[0]?.description || 'Subscription';
        
        // Find the creator by matching Stripe account
        // In production, you'd store the Stripe account ID with each creator
        const { data: settings } = await supabaseAdmin
          .from('creator_settings')
          .select('creator_id, email_subject, email_body')
          .limit(1)
          .single();

        if (!settings) {
          console.log('No creator settings found - using defaults');
          // Use default values for development
          const defaultCreatorId = '00000000-0000-0000-0000-000000000001';
          const defaultSettings = {
            creator_id: defaultCreatorId,
            email_subject: 'Please update your payment method',
            email_body: 'Your payment failed. Please update your payment method at {payment_update_link}'
          };
          
          // Try to insert default creator if not exists
          const { data: creator, error: creatorError } = await supabaseAdmin
            .from('creators')
            .insert({ id: defaultCreatorId, email: 'test@example.com' })
            .select()
            .single();
          
          if (creatorError) {
            console.log('Creator insert error:', creatorError);
            // Check if creator exists
            const { data: existingCreator } = await supabaseAdmin
              .from('creators')
              .select('id')
              .eq('id', defaultCreatorId)
              .single();
            
            if (!existingCreator) {
              console.error('Cannot create or find default creator');
              break;
            }
            console.log('Using existing creator');
          } else {
            console.log('Created default creator');
          }
          
          // Continue with default settings
          const { data: failedPayment, error: insertError } = await supabaseAdmin
            .from('failed_payments')
            .insert({
              creator_id: defaultCreatorId,
              stripe_customer_id: customer.id,
              stripe_invoice_id: invoice.id,
              customer_name: customer.name || customer.email || 'Test Customer',
              customer_email: customer.email || 'test@example.com',
              product_name: productName,
              amount: (invoice.amount_due / 100),
              currency: invoice.currency,
              status: 'failed',
              invoice_url: invoice.hosted_invoice_url,
              payment_intent_id: invoice.payment_intent as string,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting failed payment:', insertError);
            break;
          }

          console.log('Payment failed event processed with defaults:', failedPayment.id);
          break;
        }

        // Insert failed payment record
        const { data: failedPayment, error: insertError } = await supabaseAdmin
          .from('failed_payments')
          .insert({
            creator_id: settings.creator_id,
            stripe_customer_id: customer.id,
            stripe_invoice_id: invoice.id,
            customer_name: customer.name || customer.email || 'Customer',
            customer_email: customer.email || 'unknown@example.com',
            product_name: productName,
            amount: (invoice.amount_due / 100),
            currency: invoice.currency,
            status: 'failed',
            invoice_url: invoice.hosted_invoice_url,
            payment_intent_id: invoice.payment_intent as string,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting failed payment:', insertError);
          break;
        }

        // Send recovery email
        const updateUrl = invoice.hosted_invoice_url || 'https://billing.stripe.com/';
        
        // DEVELOPMENT: Override email for testing
        const testEmail = process.env.TEST_EMAIL || customer.email || 'unknown@example.com';
        
        await sendPaymentFailedEmail(
          testEmail,
          customer.name || 'Valued Customer',
          productName,
          invoice.amount_due / 100,
          updateUrl,
          {
            subject: settings.email_subject,
            body: settings.email_body
          }
        );

        console.log('Payment failed event processed:', failedPayment.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Check if this was a previously failed payment
        const { data: failedPayment } = await supabaseAdmin
          .from('failed_payments')
          .select('*')
          .eq('stripe_invoice_id', invoice.id)
          .eq('status', 'failed')
          .single();

        if (failedPayment) {
          // Update to recovered status
          await supabaseAdmin
            .from('failed_payments')
            .update({
              status: 'recovered',
              recovered_at: new Date().toISOString()
            })
            .eq('id', failedPayment.id);

          // Insert recovery record
          await supabaseAdmin
            .from('recovered_payments')
            .insert({
              failed_payment_id: failedPayment.id,
              recovered_amount: invoice.amount_paid / 100,
              stripe_payment_intent_id: invoice.payment_intent as string,
            });

          console.log('Payment recovered:', failedPayment.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);
        // Optional: Handle permanent cancellations
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}