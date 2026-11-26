# 21mine — deployment & production setup

## 1. Requirements
- Node.js 20+ (tested on 22), PostgreSQL 14+ (tested on 16)
- A persistent disk for admin-uploaded photos (`UPLOAD_DIR`) — or keep using hosted image URLs
- An SMTP mailbox for `support@21mine.shop` (order emails, password resets)
- HTTPS on `21mine.shop` (required for secure cookies, Apple Pay and Google Pay)

Recommended host: a VPS (Node + PostgreSQL + Nginx). Serverless hosts (e.g. Vercel) work for the app itself, but their disk is temporary — uploads must then go to object storage (replace `src/app/api/admin/upload` + `src/app/media` with an S3/R2 driver) or use image URLs.

## 1b. Deploying on Vercel (current setup)
- Framework: Next.js · Node 22 · Build command `npm run vercel-build` (runs migrations + idempotent seed, then `next build`).
- Database: Neon (Vercel → Storage → Neon) — provides `DATABASE_URL` automatically.
- Photo uploads: Vercel Blob (`BLOB_READ_WRITE_TOKEN`); without it uploads go to `UPLOAD_DIR` on disk (VPS only).
- Cron: `vercel.json` calls `/api/cron/expire-orders` daily (Vercel sends `CRON_SECRET`). Unpaid orders are also expired whenever someone checks out or opens the admin dashboard.
- Domain: add `21mine.shop` under Project → Domains. Vercel Authentication protects `*.vercel.app` URLs; the custom domain is public.

## 2. Environment
Copy `.env.example` to `.env` (or set variables in your host). **Never commit `.env`.** Keep separate values for demo/staging and production.

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Production PostgreSQL URL (SSL) |
| `AUTH_SECRET`, `ORDER_LINK_SECRET`, `CRON_SECRET` | 3 different random secrets (`openssl rand -base64 32`) |
| `APP_URL` | `https://21mine.shop` |
| `STORE_MODE` | `demo` until the gateway is approved & tested, then `production` |
| `PAYMENT_PROVIDER` | `simulated` (demo) → live provider id after approval |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Mailbox for `support@21mine.shop` |
| `STORE_NOTIFY_EMAIL` | `info@21mine.shop` (new-order alerts) |
| `UPLOAD_DIR` | Absolute path on persistent disk |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First admin login (used once by the seed) |

`STORE_MODE=production` refuses to run with the simulated provider, so demo payments can never reach live customers.

## 3. First deploy
```bash
npm ci
npm run db:migrate          # creates tables
npm run db:seed             # settings, currencies, zones, catalogue, policies, first admin
npm run build
npm start                   # or: pm2 start "npm start" --name 21mine
```
Put Nginx (or your host's proxy) in front with HTTPS and `proxy_set_header X-Forwarded-For`.

**Scheduled job** — release stock from unpaid orders every 15 minutes:
```
*/15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://21mine.shop/api/cron/expire-orders
```

**Updates:** `git pull && npm ci && npm run db:migrate && npm run build && pm2 restart 21mine`.
**Backups:** daily `pg_dump` + a copy of `UPLOAD_DIR`. Orders/invoices must be retained for at least 5 years.

## 4. After first login (Admin)
1. Change the admin password (Account → Settings). Add staff under Admin → Customers (role STAFF).
2. Admin → Store settings: add the support phone, review delivery fees, return window, VAT status; tick items as confirmed.
3. Admin → Currencies: update EUR/GBP/INR/KWD rates; disable currencies your gateway can't settle.
4. Admin → Products: replace illustrated images with real photography (4:5, ≥1600×2000 px), confirm prices/stock/specs.
5. Admin → Policies: have each page reviewed by a UAE lawyer, edit, tick “approved”.

## 5. Connecting a live payment gateway
Checkout talks only to the adapter in `src/lib/payments/types.ts`. To go live:
1. Choose a gateway that accepts this merchant (UAE free-zone FZCO, e-commerce activity, perfumes/cosmetics) and the currencies you enable. Candidates with UAE merchant support and hosted checkout include Network International (N-Genius), Checkout.com, Stripe, Telr, PayTabs and Amazon Payment Services — confirm current eligibility with each.
2. Implement its API in `src/lib/payments/hosted.ts` (or a new provider file registered in `src/lib/payments/index.ts`) following the gateway's **official docs**:
   - `createPayment` → create a hosted checkout session (amount in minor units, currency, our `paymentId` as reference, success/cancel URLs, idempotency key).
   - `verifyWebhook` → verify the gateway's signature scheme exactly as documented; map events to `succeeded | failed | cancelled | refunded`.
   - `refund` → call the refund endpoint.
3. Set env: `PAYMENT_PROVIDER=<id>`, `GATEWAY_API_BASE`, `GATEWAY_API_KEY`, `GATEWAY_WEBHOOK_SECRET`, `GATEWAY_CURRENCIES`, and `GATEWAY_ENABLED_METHODS` with **only** approved methods (`card`, `apple_pay`, `google_pay`).
4. Register the webhook URL `https://21mine.shop/api/payments/webhook/<id>` in the gateway dashboard.
5. Apple Pay: verify `21mine.shop` with the gateway (domain-association file served at `/.well-known/apple-developer-merchantid-domain-association` — add it under `public/.well-known/`). Google Pay: complete the gateway's/Google's production access steps.
6. Test in the gateway sandbox: success, decline, 3-D Secure, cancel, duplicate webhook delivery, refund, each enabled currency. Orders are only marked paid by a verified webhook — never by the browser redirect.
7. Switch `STORE_MODE=production`, place a small real order, refund it, then launch.

Card data never touches 21mine servers: customers pay on the gateway's hosted page.

## 6. Testing
```bash
npm test                                   # unit + integration (creates twentyonemine_test DB)
npm run build && npm start &               # then:
SEED_ADMIN_PASSWORD=... npm run e2e         # 16 browser flows (needs Chrome + poppler pdftotext)
```
