# API Reference

## Authentication

All API endpoints (except webhooks) require authentication via Bearer token:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Endpoints

### GET /api/payments

Fetch payment statistics and list.

**Response:**
```json
{
  "stats": {
    "totalFailed": 12,
    "totalRecovered": 8,
    "recoveredRevenue": "1234.56",
    "recoveryRate": "66.7"
  },
  "payments": [
    {
      "id": "uuid",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "product_name": "Pro Plan",
      "amount": 29.99,
      "status": "failed",
      "created_at": "2025-10-16T10:00:00Z"
    }
  ]
}
```

### GET /api/settings

Get creator settings.

**Response:**
```json
{
  "id": "uuid",
  "stripe_api_key": "sk_***",
  "webhook_url": "https://...",
  "email_subject": "...",
  "email_body": "..."
}
```

### POST /api/settings

Update creator settings.

**Request Body:**
```json
{
  "stripe_api_key": "sk_live_...",
  "email_subject": "Payment failed",
  "email_body": "Please update..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "updated_at": "2025-10-16T10:00:00Z"
}
```

### POST /api/webhooks/stripe

Stripe webhook endpoint (no authentication required, signature verified).

**Headers:**
```
stripe-signature: t=...,v1=...
```

**Handled Events:**
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`

### GET /api/export

Export payment data.

**Query Parameters:**
- `format` - `json` or `csv` (default: `json`)

**Response:**
CSV or JSON file download

## Rate Limits

- 100 requests per minute per IP
- Webhooks: unlimited (controlled by Stripe)

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

## Webhook Security

Stripe webhooks are verified using signature validation. Never disable this in production.

## Support

For API issues, open a GitHub issue or contact support.
