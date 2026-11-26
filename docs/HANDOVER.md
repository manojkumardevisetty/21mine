# 21mine — merchant handover checklist

Status: **demo-ready**. Everything below "What works" was verified by automated tests (23 unit/integration tests + 16 end-to-end browser flows) and a production build.

## 1. What works in the demo
- [x] Storefront: home, 6 categories, 26 products, 4-image swipe galleries, search, filters (category, price, availability), sorting, mobile-first layout, English/Arabic (RTL).
- [x] Product pages: AED (or selected currency) prices, variants (size / nail size / colour), stock status, delivery & returns info, fragrance notes / nail shape & finish / materials, safety & care.
- [x] Multi-currency: AED, USD, EUR, GBP, SAR, QAR, KWD, BHD, OMR, INR. Orders, payments and invoices are in the customer's currency with the FX rate stored.
- [x] Bag → checkout (guest or account) → UAE or international address → live total incl. delivery/discount/VAT → simulated payment → confirmation → PDF invoice.
- [x] Simulated credit/debit card, Apple Pay, Google Pay — clearly labelled, no card data requested; success, decline (retry) and cancel.
- [x] Order status and payment status tracked separately (pending / paid / failed / cancelled / refunded).
- [x] No duplicate orders or stock changes on double-clicks/retries; no overselling; unpaid orders auto-cancel after 60 min and release stock.
- [x] Accounts: register, login, logout, sign out everywhere, password reset email, profile, marketing opt-in (separate from checkout), saved addresses, order history, invoice downloads, privacy requests.
- [x] Guest orders: secure signed links (30 days) for order page and invoice.
- [x] Customers can only see their own orders, addresses and invoices; admin is role-protected (ADMIN / STAFF).
- [x] Admin: dashboard & launch checklist, orders (search, filters, fulfil, tracking, refund, notes), products/variants/images (upload), categories, discount codes, review moderation, customers & roles, messages, settings & delivery zones, currencies, policy editor, email outbox, audit log of sensitive changes.
- [x] Emails: welcome, password reset/changed, order confirmed, payment declined, cancelled, shipped, delivered, refunded, contact-form acknowledgement + store alerts to info@21mine.shop.
- [x] Policy pages (Terms, Privacy, Cookies + preferences, Shipping, Returns, Contact & Business info) linked in the footer and at signup/checkout.

## 2. Needs merchant sign-off (real business details & policies)
Filled from the uploaded licence — please **confirm**:
- [ ] Legal entity: XENTERPRISES DIGITAL SERVICES - FZCO · Licence 18250 · Dubai Integrated Economic Zones Authority (IFZA) · Premises DSO-IFZA, IFZA Properties, Dubai Silicon Oasis (licence valid to 22 Jun 2027).
- [ ] **Licensed activities** are "E-commerce" and "Computer Systems & Communication Equipment Software Trading". Confirm with IFZA that selling perfumes, cosmetics/nail products and fashion accessories is covered, or add the activity. The licence also states a valid **Dubai Unified Licence (DUL)** is required to operate — confirm it is active.
- [ ] Confirm whether your perfumes and nail/cosmetic products need **product registration** with UAE authorities (e.g. Dubai Municipality) before sale.

Missing — **add before launch** (Admin → Store settings):
- [ ] Customer-service **phone / WhatsApp number** (not provided; left blank rather than invented).
- [ ] **VAT status**: VAT is OFF. If registered with the FTA, enter the 15-digit TRN, enable VAT and confirm tax-invoice wording with your tax advisor (only then do invoices say “TAX INVOICE”). Also confirm VAT treatment of exports.

Business decisions to confirm (opening values set, editable in Admin):
- [ ] Product line-up, **prices**, opening **stock**, specifications (notes, sizes, materials) and product photos (current images are original illustrations — replace with real photography).
- [ ] Delivery fees/times: UAE AED 15 (Dubai/Sharjah/Ajman) / AED 20 (other emirates), free over AED 200; GCC AED 45 (free over AED 500); international AED 95. Courier partner(s).
- [ ] **International shipping of perfumes** (alcohol-based, flammable): confirm which couriers/countries accept them; disable zones you can't serve.
- [ ] Returns: 7 days, unopened only; opened perfumes, tried/used press-ons, opened nail-care and earrings non-returnable unless faulty; faulty items reported within 48 h. Confirm these rules.
- [ ] Exchange rates (EUR/GBP/INR/KWD set from 19 Nov 2026 mid-market) and which currencies to keep enabled.
- [ ] **Legal review** of all six policy pages by a UAE lawyer (UAE PDPL, consumer protection and e-commerce rules), then tick "approved" in Admin → Policies.
- [ ] Email hosting/SMTP for support@21mine.shop and info@21mine.shop.

## 3. What the gateway will typically ask for (verify with the chosen provider)
No gateway has been selected yet, so requirements must be confirmed against the provider's current onboarding list. Typically:
- [ ] Trade licence (+ DUL), Memorandum/Articles, share certificate / shareholder register.
- [ ] Passport, Emirates ID / visa of the manager (Gabriele Bigontina per licence) and ultimate beneficial owners.
- [ ] UAE corporate bank account in the company name (IBAN letter / statement).
- [ ] Live website on 21mine.shop with HTTPS showing: products with prices, contact details (email, **phone**, address), Terms, Privacy, Shipping, Returns/Refund policy, currency, and card/wallet logos only once approved.
- [ ] Description of business, product categories (perfumes/cosmetics may be reviewed as restricted by some providers), expected monthly volume, average ticket, countries served and **currencies to settle**.
- [ ] Confirmation that the product categories and international selling are accepted, and whether multi-currency presentment/settlement is supported.

## 4. Activating live card, Apple Pay and Google Pay (summary — full steps in SETUP.md §5)
1. Gateway approves the merchant account; obtain sandbox and live API keys and webhook secret.
2. Implement the gateway's documented API in the payment adapter (`src/lib/payments/hosted.ts`): hosted checkout session, signed webhook verification, refunds.
3. Configure env vars (`PAYMENT_PROVIDER`, `GATEWAY_*`), register webhook `https://21mine.shop/api/payments/webhook/<id>`.
4. Apple Pay: domain verification of 21mine.shop through the gateway; Google Pay: production access via the gateway/Google console.
5. Enable only approved methods in `GATEWAY_ENABLED_METHODS`; wallets are shown only on eligible devices/browsers.
6. Sandbox tests: success, decline, 3-D Secure, cancel, duplicate webhooks, refunds, every enabled currency; check amounts/currency match.
7. Set `STORE_MODE=production` (simulated payments then become impossible), configure SMTP, place and refund a small live order, launch.
