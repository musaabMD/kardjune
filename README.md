# DrKard

Next.js frontend on Cloudflare Workers via OpenNext, Clerk auth, Stripe billing, OpenRouter AI, Cloudflare R2 storage, Cloudflare D1 app data, Cloudflare KV quotas, and Resend email.

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in local service keys.
2. Start the Next.js app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local development falls back to bundled sample exams/questions when Cloudflare bindings are not available.

## Cloudflare Storage

- **R2**: create `drkard-qbanks`, `drkard-uploads`, and `drkard-opennext-cache`.
- **D1**: create `drkard-core`, then run the SQL migrations in `migrations/`.
- **KV**: create `drkard-limits`.
- Update `wrangler.jsonc` with the real D1 database id and KV namespace id.

Question banks live in R2:

```txt
qbanks/v1/{examSlug}/all.json
```

Example upload:

```bash
wrangler r2 object put drkard-qbanks/qbanks/v1/smle/all.json --file data/qbanks/v1/smle/all.json
```

Apply D1 migrations:

```bash
wrangler d1 migrations apply drkard-core
```

## Cloudflare Deploy

Build and deploy require build-time public env vars:

```bash
# .env.production.local must include:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL
npm run cf:build
npm run cf:deploy
```

Preview locally:

```bash
npm run cf:preview
```

Set production runtime secrets:

```bash
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_WEBHOOK_SIGNING_SECRET
wrangler secret put OPENROUTER_API_KEY
wrangler secret put OPENROUTER_MODEL
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_EMAIL
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_MONTHLY_ID
wrangler secret put STRIPE_PRICE_ANNUAL_ID
wrangler secret put MAX_UPLOAD_BYTES
wrangler secret put NEXT_PUBLIC_SITE_URL
wrangler secret put DRKARD_ADMIN_SECRET
```

## Free vs Pro

| Feature | Free | Pro |
| --- | --- | --- |
| Questions / 24h | 20 | Unlimited |
| AI assistant | No | Yes ($2/month allowance) |
| Uploads / 24h | 5 | Unlimited |

Pro AI usage is tracked in D1 (`ai_usage_events`). `/api/chat` records estimated OpenRouter cost; over-budget Pro users receive `429` with `code: "ai_budget_exceeded"`.

Admin usage:

```txt
GET /api/admin/ai-usage?period=2026-06
X-Admin-Secret: <DRKARD_ADMIN_SECRET>
```

See [docs/cloudflare-architecture.md](docs/cloudflare-architecture.md) for the storage map.
