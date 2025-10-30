// ============================================
// MULTI-TENANT WEBHOOK HANDLER
// Each creator has their own webhook URL with unique secret
// URL format: /api/webhooks/stripe/[creatorId]
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import Stripe from 'stripe';

export async function POST(
  req: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  const creatorId = params.creatorId;
  console.log('🔔 Webhook received for creator:', creatorId, 'at:', new Date().toISOString());

  // 1. Fetch creator's settings (webhook secret, Stripe key, email settings)
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('creator_settings')
    .select('stripe_api_key, stripe_webhook_secret, resend_api_key, email_subject, email_body')
    .eq('creator_id', creatorId)
    .single();

  if (settingsError || !settings) {
    console.error('❌ Creator not found or not configured:', creatorId);
    return NextResponse.json(
      { error: 'Creator not configured' },
      { status: 400 }
    );
  }

  if (!settings.stripe_api_key || !settings.stripe_webhook_secret) {
    console.error('❌ Creator missing Stripe configuration:', creatorId);
    return NextResponse.json(
      { error: 'Stripe not configured for this creator' },
      { status: 400 }
    );
  }

  console.log('✅ Creator settings loaded');

  // 2. Verify webhook signature with CREATOR's secret
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature in headers');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }
  console.log('✅ Stripe signature present');

  // Create Stripe instance with CREATOR's API key
  const creatorStripe = new Stripe(settings.stripe_api_key, {
    apiVersion: '2024-11-20.acacia',
  });

  let event: Stripe.Event;

  try {
    // Verify with CREATOR's webhook secret
    event = creatorStripe.webhooks.constructEvent(
      body,
      signature,
      settings.stripe_webhook_secret
    );
    console.log('✅ Webhook signature verified with creator secret, event type:', event.type);
  } catch (err: unknown) {
    console.error('❌ Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // 3. Process webhook events
  try {
    switch (event.type) {
      case 'invoice.payment_failed': {
        console.log('💳 Processing invoice.payment_failed event');
        const invoice = event.data.object;
        console.log('📄 Invoice ID:', invoice.id);
        console.log('👤 Customer ID:', invoice.customer);

        // Get customer details (using creator's Stripe instance)
        const customer = await creatorStripe.customers.retrieve(
          invoice.customer as string
        );
        console.log('✅ Customer retrieved:', customer.id);

        const customerData = customer as Stripe.Customer;
        const productName = invoice.lines.data[0]?.description || 'Subscription';

        // Insert failed payment record
        console.log('💾 Inserting failed payment record...');
        const paymentData = {
          creator_id: creatorId,
          stripe_customer_id: customerData.id,
          stripe_invoice_id: invoice.id,
          customer_name: customerData.name || customerData.email || 'Customer',
          customer_email: customerData.email || null,
          product_name: productName,
          amount: (invoice.amount_due / 100),
          currency: invoice.currency,
          status: 'failed' as const,
          invoice_url: invoice.hosted_invoice_url,
          payment_intent_id: invoice.payment_intent as string,
        };
        console.log('📋 Payment data:', JSON.stringify(paymentData, null, 2));

        const { data: failedPayment, error: insertError } = await supabaseAdmin
          .from('failed_payments')
          // @ts-expect-error - Supabase type inference issue
          .insert(paymentData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error inserting failed payment:', insertError);
          console.error('📋 Error details:', JSON.stringify(insertError, null, 2));
          break;
        }
        console.log('✅ Failed payment record created:', failedPayment);

        // Send recovery email
        console.log('📧 Preparing to send recovery email...');

        if (!customerData.email) {
          console.log('⚠️  Customer has no email address, skipping email notification');
        } else {
          const apiKey = settings.resend_api_key || process.env.RESEND_API_KEY;

          if (!apiKey) {
            console.error('❌ No Resend API key configured');
            console.error('⚠️  Email will not be sent');
          } else {
            console.log('✅ Resend API key found');
            const resendClient = new Resend(apiKey);

            const subject = settings.email_subject
              .replace('{name}', customerData.name || 'Valued Customer');

            const body = settings.email_body
              .replace('{name}', customerData.name || 'Valued Customer')
              .replace('{product_name}', productName)
              .replace('{amount}', `${(invoice.amount_due / 100).toFixed(2)}`)
              .replace('{payment_update_link}', invoice.hosted_invoice_url || 'https://billing.stripe.com/');

            console.log('📧 Sending email to:', customerData.email);
            console.log('📧 Subject:', subject);

            try {
              const emailResult = await resendClient.emails.send({
                from: 'onboarding@resend.dev',
                to: [customerData.email],
                subject,
                text: body,
              });

              if (emailResult.error) {
                console.error('❌ Resend API error:', emailResult.error);
                console.error('📋 Error details:', JSON.stringify(emailResult.error, null, 2));
              } else {
                console.log('✅ Email sent successfully! Email ID:', emailResult.data?.id);
              }
            } catch (emailError) {
              console.error('❌ Error sending email (exception):', emailError);
              console.error('📋 Email error details:', JSON.stringify(emailError, null, 2));
            }
          }
        }

        type FailedPaymentType = { id: string } | null;
        const failedPaymentData = failedPayment as FailedPaymentType;
        console.log('✅ Payment failed event processed successfully:', failedPaymentData?.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log('💚 Processing invoice.payment_succeeded event');
        const invoice = event.data.object;
        console.log('📄 Invoice ID:', invoice.id);

        // Mark payment as recovered if it was previously failed
        const { data: existingPayment } = await supabaseAdmin
          .from('failed_payments')
          .select('id, status')
          .eq('stripe_invoice_id', invoice.id)
          .eq('creator_id', creatorId)
          .single();

        if (existingPayment && existingPayment.status === 'failed') {
          console.log('🔄 Marking payment as recovered:', existingPayment.id);
          
          await supabaseAdmin
            .from('failed_payments')
            // @ts-expect-error - Supabase type inference issue
            .update({
              status: 'recovered',
              recovered_at: new Date().toISOString()
            })
            .eq('id', existingPayment.id);

          console.log('✅ Payment marked as recovered');
        } else {
          console.log('ℹ️  No failed payment record found for this invoice');
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
