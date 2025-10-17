// ============================================
// 8. CRON JOBS (api/cron/process-retries/route.ts)
// ============================================
// This endpoint should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPaymentFailedEmail } from '@/lib/email';
import { scheduleEmailRetry } from '@/lib/email-retry';
import { EmailRetry } from '@/types/database';

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find pending retries that are due
    const { data: pendingRetries } = await supabaseAdmin
      .from('email_retries')
      .select(`
        *,
        failed_payment:failed_payments(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString());

    if (!pendingRetries || pendingRetries.length === 0) {
      return NextResponse.json({ message: 'No retries to process' });
    }

    const results = await Promise.allSettled(
      pendingRetries.map(async (retry: EmailRetry) => {
        const payment = retry.failed_payment;
        
        // Skip if already recovered
        if (payment.status === 'recovered') {
          await supabaseAdmin
            .from('email_retries')
            .update({ status: 'cancelled' })
            .eq('id', retry.id);
          return;
        }

        // Get creator settings for email template
        const { data: settings } = await supabaseAdmin
          .from('creator_settings')
          .select('*')
          .eq('creator_id', payment.creator_id)
          .single();

        if (!settings) return;

        // Send retry email
        await sendPaymentFailedEmail(
          payment.customer_email,
          payment.customer_name,
          payment.product_name,
          payment.amount,
          payment.invoice_url || '',
          {
            subject: settings.email_subject,
            body: settings.email_body
          }
        );

        // Mark as sent
        await supabaseAdmin
          .from('email_retries')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', retry.id);

        // Schedule next retry if needed
        if (retry.retry_number < 2) {
          await scheduleEmailRetry(payment.id, retry.retry_number + 1);
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Retries processed',
      successful,
      failed,
      total: pendingRetries.length
    });
  } catch (error: unknown) {
    console.error('Error processing retries:', error);
    return NextResponse.json(
      { error: 'Failed to process retries', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
