# 21mine — online store

Perfumes, press-on nails, nail care and fashion accessories. Built with **Next.js 15 (App Router) + TypeScript + PostgreSQL (Drizzle ORM) + Auth.js**.

Operated by **XENTERPRISES DIGITAL SERVICES - FZCO** (IFZA licence 18250, Dubai Silicon Oasis).

## Features
- **Storefront:** home, 6 categories, 26 products with 4-image swipe galleries, search, filters (category / price / availability / sort), product pages with variants, stock, delivery & care info, verified-purchase reviews.
- **Multi-currency:** prices in AED; customers can browse and pay in AED, USD, EUR, GBP, SAR, QAR, KWD, BHD, OMR, INR (admin-managed rates; rate stored on every order).
- **International delivery:** UAE per-emirate zones, GCC and worldwide zones with fees / free-delivery thresholds; UAE address fields (emirate, area, building/villa, unit, landmark), postal codes where needed.
- **Checkout:** guest or account checkout, live server-side totals, discount codes, optional VAT, idempotent order creation, stock reservation without overselling, purchase-time price snapshots.
- **Payments:** gateway-neutral adapter. Demo uses a clearly labelled *simulated* gateway (success / decline / cancel, no card data). Live hosted-checkout template with signed webhooks, idempotent events, amount/currency checks.
- **Accounts:** register, login, logout, sign-out-everywhere, password reset by email, profile, marketing opt-in (separate from checkout), saved addresses, order history, PDF invoices, privacy requests.
- **Invoices:** PDF with invoice number, merchant details, line items, delivery, discounts, VAT (when confirmed), currency & FX note, payment status; “Sample invoice — no payment collected” in demo.
- **Admin:** dashboard + launch checklist, orders (search/filter, fulfilment, tracking, refunds, notes, resend email), products / variants / images (upload), categories, discounts, reviews moderation, customers & roles, messages, store settings & delivery zones, currencies, policies editor, email outbox, audit log.
- **Policies:** Terms of Sale, Privacy, Cookies (+ preferences page), Shipping, Returns, Contact & Business info — auto-filled from settings, footer-linked, flagged for legal review.
- **English + Arabic (RTL)** interface switch, mobile-first, accessible forms with visible focus and clear errors.

## Quick start (local)
```bash
cp .env.example .env            # set DATABASE_URL, AUTH_SECRET, ORDER_LINK_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run db:migrate && npm run db:seed
npm run dev                     # http://localhost:3000  ·  admin at /admin (SEED_ADMIN_EMAIL)
```

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build, run production server |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (safe for production) |
| `npm run db:seed` | Seed settings, currencies, zones, catalogue, policies, first admin (idempotent) |
| `npm run db:reset` | DEV ONLY — wipe and re-seed |
| `npm test` | Unit + database integration tests (Vitest, uses a separate test DB) |
| `npm run e2e` | Browser end-to-end tests against a running server (needs Chrome + `pdftotext`) |
| `npx tsx scripts/gen-images.ts` | Regenerate the illustrated product images |

## Docs
- [docs/SETUP.md](docs/SETUP.md) — deployment & production setup, going live with a gateway
- [docs/HANDOVER.md](docs/HANDOVER.md) — merchant handover checklist (what works, what needs sign-off)

## Project layout
```
src/app/(store)/     storefront, account, checkout, payment, orders, policies
src/app/admin/       admin panel + server actions
src/app/api/         invoices, payment webhooks, cron, uploads, auth
src/lib/             pricing, checkout, payments (adapter), invoice PDF, mail, auth helpers
src/db/schema.ts     database schema · drizzle/ migrations · scripts/ seed, e2e, images
src/data/            launch catalogue & policy drafts
```
