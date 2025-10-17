# Deployment Guide

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL
NEXTAUTH_SECRET
CRON_SECRET
```

### Update Stripe Webhook

1. Go to Stripe Dashboard → Webhooks
2. Update endpoint to: `https://your-app.vercel.app/api/webhooks/stripe`
3. Copy new webhook secret
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel

## Deploy to Other Platforms

### Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### Netlify

```bash
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t churnguard .
docker run -p 3000:3000 --env-file .env churnguard
```

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Stripe webhook updated
- [ ] SSL certificate active
- [ ] Email sending works
- [ ] Dashboard loads correctly
- [ ] Test webhook with real event
- [ ] Monitoring set up

## Monitoring

### Vercel Analytics

Add to your app:
```bash
npm install @vercel/analytics
```

### Sentry Error Tracking

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Better Uptime
- Pingdom

## Backup Strategy

### Database Backups

Supabase provides automatic daily backups. For manual backups:

```bash
pg_dump -h db.xxx.supabase.co -U postgres > backup.sql
```

### Code Backups

Ensure code is pushed to GitHub regularly.

## Scaling

For high-volume installations:
- Enable Vercel Pro for better performance
- Use Supabase Pro for connection pooling
- Implement caching with Redis
- Consider separating webhook processing

See full scaling guide in docs.
