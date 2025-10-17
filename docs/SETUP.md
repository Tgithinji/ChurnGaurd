# Setup Guide

## Prerequisites

- Node.js 18+
- Stripe account
- Supabase account
- Resend account

## Step-by-Step Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/churnguard.git
cd churnguard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

### 4. Set Up Database

1. Create a Supabase project
2. Go to SQL Editor
3. Run the contents of `schema.sql`
4. Verify tables were created in Table Editor

### 5. Configure Stripe Webhooks

**Local Development:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Production:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `invoice.payment_failed`, `invoice.payment_succeeded`
4. Copy webhook secret to environment variables

### 6. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 7. Test Webhooks

```bash
stripe trigger invoice.payment_failed
```

Check your dashboard for the failed payment event.

## Troubleshooting

### Webhook not receiving events
- Ensure Stripe CLI is running
- Verify webhook secret matches
- Check console for errors

### Database connection failed
- Verify Supabase URL and keys
- Check if project is paused
- Ensure RLS policies are enabled

### Email not sending
- Verify Resend API key
- Check sender domain is verified
- Review Resend logs

For more help, see [Deployment Guide](./DEPLOYMENT.md)
