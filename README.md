# 🛡️ ChurnGuard

> Automatically detect and recover failed Stripe payments with smart notifications

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## ✨ Features

- 🔄 Automatic failed payment detection via Stripe webhooks
- 📧 Smart recovery email notifications
- 📊 Real-time analytics dashboard
- 💰 Track recovered revenue and recovery rates
- 🎯 Customer segmentation for targeted messaging
- 🧪 A/B testing framework for email optimization
- 📈 Comprehensive reporting and insights

## 🚀 Quick Start

### Deploy to Vercel (Recommended)

1. Click the "Deploy" button above
2. Set up environment variables (see below)
3. Deploy!

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/churnguard.git
cd churnguard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
# (Copy schema.sql to Supabase SQL Editor and run)

# Start development server
npm run dev

# In another terminal, forward Stripe webhooks
npm run stripe:listen
```

## 📋 Prerequisites

- [Stripe](https://stripe.com) account with API access
- [Supabase](https://supabase.com) project
- [Resend](https://resend.com) account for email sending
- Node.js 18+ installed

## ⚙️ Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `NEXT_PUBLIC_SITE_URL` | Your application URL |

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [Deployment Guide](./docs/DEPLOYMENT.md) - Deploy to production
- [API Reference](./docs/API.md) - API endpoints documentation

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email**: Resend
- **Deployment**: Vercel

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## 📊 Key Metrics

ChurnGuard helps you track:
- **Recovery Rate**: Percentage of failed payments recovered
- **Recovered Revenue**: Total dollars recovered
- **Time to Recovery**: Average time until customer updates payment
- **Email Performance**: Open rates and click-through rates

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- 📖 [Documentation](./docs)
- 🐛 [Report Bug](https://github.com/yourusername/churnguard/issues)
- 💡 [Request Feature](https://github.com/yourusername/churnguard/issues)

---

**Built with ❤️ for subscription businesses**
