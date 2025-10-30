// ============================================
// 10. UPDATED WEBHOOK HANDLER (app/api/webhooks/stripe/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received at:', new Date().toISOString());
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature found in headers');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }
  console.log('✅ Stripe signature present');

  let event: Stripe.Event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook signature verified, event type:', event.type);
  } catch (err: unknown) {
    console.error('❌ Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'invoice.payment_failed': {
        console.log('💳 Processing invoice.payment_failed event');
        const invoice = event.data.object;
        console.log('📄 Invoice ID:', invoice.id);
        console.log('👤 Customer ID:', invoice.customer);
        
        // Get customer details from invoice (already included in webhook payload)
        // Note: For full customer object with metadata, we need to retrieve it
        // This uses YOUR Stripe key since the webhook is sent to YOUR endpoint
        const customer = await stripe.customers.retrieve(
          invoice.customer as string
        );
        console.log('✅ Customer retrieved:', customer.id);

        // Get product name from line items
        const productName = invoice.lines.data[0]?.description || 'Subscription';
        
        // CRITICAL: Extract creator_id from customer metadata
        // Customers MUST be created with metadata: { creator_id: 'uuid' }
        // This metadata was set when the creator created the customer in THEIR Stripe account
        const customerData = customer as Stripe.Customer;
        console.log('🔍 Customer metadata:', JSON.stringify(customerData.metadata, null, 2));
        const creatorId = customerData.metadata?.creator_id;
        
        if (!creatorId) {
          console.error('❌ No creator_id in customer metadata for customer:', customerData.id);
          console.error('📋 Available metadata keys:', Object.keys(customerData.metadata || {}));
          console.error('⚠️  Customer must be created with metadata.creator_id');
          console.error('💡 To fix: Update customer in Stripe with metadata: { creator_id: "your-uuid" }');
          return NextResponse.json(
            { error: 'Customer missing creator_id metadata', customerId: customerData.id },
            { status: 400 }
          );
        }
        console.log('✅ Creator ID found:', creatorId);

        // Get creator settings for this specific creator
        console.log('🔍 Fetching creator settings for:', creatorId);
        const { data: settings, error: settingsError } = await supabaseAdmin
          .from('creator_settings')
          .select('creator_id, email_subject, email_body, resend_api_key')
          .eq('creator_id', creatorId)
          .single();

        if (settingsError) {
          console.error('❌ Error fetching creator settings:', settingsError);
        }

        type SettingsType = { creator_id: string; email_subject: string; email_body: string; resend_api_key?: string } | null;
        const settingsData = settings as SettingsType;

        if (!settingsData) {
          console.error('❌ No settings found for creator:', creatorId);
          console.error('💡 Creator needs to configure settings in dashboard first');
          break;
        }
        console.log('✅ Creator settings loaded');

        // Insert failed payment record (RLS enforced by creator_id)
        console.log('💾 Inserting failed payment record...');
        const paymentData = {
          creator_id: settingsData.creator_id,
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

        // Send recovery email using creator's Resend key if available
        console.log('📧 Preparing to send recovery email...');
        
        // Skip email if customer has no email address
        if (!customerData.email) {
          console.log('⚠️  Customer has no email address, skipping email notification');
        } else {
          const apiKey = settingsData.resend_api_key || process.env.RESEND_API_KEY;
          
          if (!apiKey) {
            console.error('❌ No Resend API key configured (neither in settings nor env)');
            console.error('⚠️  Email will not be sent');
          } else {
            console.log('✅ Resend API key found:', apiKey.substring(0, 10) + '...');
            const resendClient = new Resend(apiKey);

            const subject = settingsData.email_subject
              .replace('{name}', customerData.name || 'Valued Customer');

            const body = settingsData.email_body
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
              
              // Check if there's an error in the response
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
        const invoice = event.data.object;

        // Check if this was a previously failed payment
        const { data: failedPayment } = await supabaseAdmin
          .from('failed_payments')
          .select('*')
          .eq('stripe_invoice_id', invoice.id)
          .eq('status', 'failed')
          .single();

        type RecoveredPaymentType = { id: string } | null;
        const recoveredPaymentData = failedPayment as RecoveredPaymentType;

        if (recoveredPaymentData) {
          // Update to recovered status
          await supabaseAdmin
            .from('failed_payments')
            // @ts-expect-error - Supabase type inference issue
            .update({
              status: 'recovered',
              recovered_at: new Date().toISOString()
            })
            .eq('id', recoveredPaymentData.id);

          console.log('Payment recovered:', recoveredPaymentData.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
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
