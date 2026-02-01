# Assemble.ai - Claude Code Context

## Database Architecture
- **Production**: Supabase PostgreSQL (configured via DATABASE_URL in .env)
- **Local Development**: Docker PostgreSQL (same schema, local instance)
- **No SQLite**: This project uses PostgreSQL exclusively

## Environment Files
| File | Purpose |
|------|---------|
| `.env` | Production secrets (Supabase DATABASE_URL, API keys) |
| `.env.local` | Local overrides (typically empty or Redis URL) |
| `.env.development` | Development defaults |

**Load Order** (highest to lowest priority):
1. `.env.local`
2. `.env.development`
3. `.env`

## Required Services (Local Dev)
```bash
npm run db:up    # Start Docker PostgreSQL + Redis
npm run dev      # Start Next.js + workers
```

## Workers
| Worker | Purpose |
|--------|---------|
| `doc-worker` | Document processing (OCR, parsing, RAG indexing) |
| `draw-worker` | Drawing extraction (AI-powered metadata extraction) |

**Important:** Workers MUST load env files in same order as Next.js.

## Database Migrations
- Location: `drizzle-pg/`
- Apply changes: `npm run db:push`
- View database: `npm run db:studio`

## Polar Payment Integration

### Local Webhook Testing with ngrok

To test Polar webhooks locally, you need to expose your local server:

1. **Install ngrok**: https://ngrok.com/download

2. **Start ngrok**:
```bash
ngrok http 3000
```

3. **Update Polar webhook URL**:
   - Go to [Polar Dashboard](https://sandbox.polar.sh) → Settings → Webhooks
   - Add/update endpoint URL: `https://YOUR-NGROK-URL.ngrok.io/api/auth/polar/webhooks`
   - Select events: `order.created`, `order.paid`, `order.refunded`, `subscription.created`, `subscription.updated`, `subscription.canceled`

**Note**: ngrok URL changes every restart - update in Polar each time!

### Testing Payments

- **Sandbox test card**: `4242 4242 4242 4242`, any future date, any CVC
- **Production testing**: Create a 100% discount code in Polar → Products → Discounts

### Environment Variables
```bash
POLAR_ACCESS_TOKEN=pat_xxx          # From Polar → Settings → API Keys
POLAR_WEBHOOK_SECRET=whsec_xxx      # From Polar → Webhooks
POLAR_STARTER_PRODUCT_ID=prod_xxx   # Create in Polar dashboard
POLAR_PROFESSIONAL_PRODUCT_ID=prod_xxx

# Inngest (for reliable webhook processing)
INNGEST_EVENT_KEY=xxx               # From Inngest dashboard
```

### Admin Panel

Access product management at `/admin/products` to:
- Update Polar product IDs (different for sandbox vs production)
- Toggle products active/inactive
- View current environment status

### Inngest Dashboard

Monitor webhook processing at: https://app.inngest.com
- View event history
- Check function execution
- Debug failed webhooks
