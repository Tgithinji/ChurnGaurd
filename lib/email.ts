// ============================================
// 6. EMAIL SERVICE (lib/email.ts)
// ============================================
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPaymentFailedEmail(
  to: string,
  customerName: string,
  productName: string,
  amount: number,
  updateUrl: string,
  template: { subject: string; body: string }
) {
  const subject = template.subject
    .replace('{name}', customerName);

  const body = template.body
    .replace('{name}', customerName)
    .replace('{product_name}', productName)
    .replace('{amount}', `$${amount.toFixed(2)}`)
    .replace('{payment_update_link}', updateUrl);

  try {
    // DEVELOPMENT MODE: Log email instead of sending if no API key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_...') {
      console.log('📧 [DEV MODE] Email would be sent:');
      console.log('  To:', to);
      console.log('  Subject:', subject);
      console.log('  Body:', body);
      return { success: true, data: { id: 'dev-mode-email' } };
    }

    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [to],
      subject,
      text: body,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error };
  }
}