// Policy page drafts. {{tokens}} are filled from Store Settings at render time so the pages always
// match the configured business details. Every page is flagged "needs legal review" until approved in Admin.
export const POLICY_PAGES: { slug: string; title: string; sortOrder: number; content: string }[] = [
  {
    slug: "terms", title: "Terms and Conditions of Sale", sortOrder: 1,
    content: `These Terms and Conditions of Sale ("Terms") apply to every order placed on {{siteUrl}} (the "Store"). The Store is operated by **{{legalName}}**, trade licence no. {{tradeLicence}} issued by {{licenceAuthority}}, registered address {{address}} ("we", "us"). {{brandName}} is our trading brand.

By placing an order you confirm that you are at least 18 years old (or are ordering with the consent of a parent or guardian), that the details you provide are accurate, and that you accept these Terms together with our [Shipping and Delivery Policy](/policies/shipping), [Returns, Refunds and Cancellations Policy](/policies/returns) and [Privacy Policy](/policies/privacy).

## 1. Products and descriptions
We describe products, sizes, ingredients/materials and colours as accurately as possible. Product images are illustrations; colours may vary slightly between screens. Perfume notes describe the scent profile and are not a list of ingredients. Always read the safety and care information on the product page and packaging before use.

## 2. Prices and currencies
- Prices are set in UAE Dirhams (AED). You may choose to view and pay in another supported currency; the amount is converted at the exchange rate shown at checkout and fixed when you place your order.
- Your bank or card issuer may apply its own foreign-exchange or cross-border fees. These are outside our control.
- {{taxStatement}}
- Delivery fees are calculated by destination and shown before you place your order. The order total on the review step is the final amount payable to us.

## 3. Orders and contract
Your order is an offer to buy. A contract is formed when we confirm your payment by email. We may decline or cancel an order (with a full refund of any amount paid) if the product is unavailable, a pricing or listing error is obvious, the delivery address is outside our delivery zones, or payment verification fails. Quantities per item may be limited.

## 4. Payment
Payments are processed by {{paymentProvider}} on its secure hosted page. We never see or store your full card number or security code. Your order is confirmed only after the payment provider confirms a successful payment to us. If a payment is not completed within 60 minutes, the order is cancelled automatically and the items are released.

## 5. Delivery
Delivery areas, fees and estimated timeframes are set out in our [Shipping and Delivery Policy](/policies/shipping). Risk in the products passes to you on delivery. Customs duties and import taxes for deliveries outside the UAE are payable by the recipient unless stated otherwise at checkout.

## 6. Cancellations, returns and refunds
See our [Returns, Refunds and Cancellations Policy](/policies/returns). For hygiene and safety reasons, opened perfumes, used press-on nails and opened nail-care products cannot be returned unless faulty or not as described. Nothing in these Terms limits your statutory rights under UAE consumer protection law.

## 7. Use of products
Perfumes are flammable and for external use only. Press-on nails and nail glue must be used as instructed; do not apply to damaged or infected nails and stop use if irritation occurs. Keep all products out of reach of children.

## 8. Accounts
You are responsible for keeping your password confidential. Tell us immediately at {{supportEmail}} if you suspect unauthorised use of your account.

## 9. Liability
To the extent permitted by law, our liability for any order is limited to the amount you paid for it. We are not liable for losses that were not foreseeable, or for delays caused by events beyond our reasonable control. Nothing in these Terms excludes liability that cannot be excluded under UAE law.

## 10. Governing law
These Terms are governed by the laws of the Emirate of Dubai and the federal laws of the United Arab Emirates. The courts of Dubai have jurisdiction, without affecting any mandatory consumer rights you have in your country of residence.

## 11. Contact
{{contactBlock}}

_Last updated: {{updated}}_`,
  },
  {
    slug: "privacy", title: "Privacy and Data Collection Policy", sortOrder: 2,
    content: `This policy explains how **{{legalName}}** ("we"), trading as {{brandName}}, collects and uses personal data when you use {{siteUrl}}. We process personal data in line with UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data and other applicable laws, including the data protection laws of your country where they apply to you.

## 1. Who is responsible
{{legalName}}, {{address}}. Contact for privacy requests: **{{supportEmail}}**.

## 2. What we collect
| Data | When | Why |
|---|---|---|
| Name, email, phone | Account registration, checkout, contact form | To create your account, process and deliver orders, and answer enquiries |
| Delivery address (country, emirate/region, area/city, building, unit, landmark, postal code) | Checkout, saved addresses | To deliver your order and calculate delivery fees and taxes |
| Order details (products, prices, currency, discounts, invoices, order and payment status) | When you order | To fulfil orders, provide invoices, handle returns and meet accounting obligations |
| Payment reference and status | When you pay | To confirm payment. Card details are entered on our payment provider's page; we never receive your full card number or security code |
| Password (stored only as a secure hash) | Registration | To protect your account |
| Marketing preference | Only if you opt in | To send offers by email. Optional and separate from placing an order |
| Technical data needed to run the site (session cookies, security logs, rate-limit counters) | When you browse | To keep you signed in, keep your bag, and protect the Store from abuse |

We do not use advertising or analytics trackers on this Store. We do not sell personal data.

## 3. Legal bases
We use your data to perform our contract with you (orders, delivery, invoices), to comply with legal obligations (e.g. commercial and tax record-keeping), for our legitimate interests in operating and securing the Store, and with your consent for marketing emails (you can withdraw consent at any time in your account or by emailing us).

## 4. Who we share data with
Only with service providers who need it to run the Store, under contract and only for the purposes above:
- **Payment provider:** {{paymentProvider}} - processes your payment.
- **Delivery partners:** the courier delivering your order receives your name, phone and address.
- **Hosting and email providers:** host the Store database and send transactional emails (order confirmations, password resets).
- **Authorities:** where required by law.

Some providers may process data outside the UAE. Where this happens we rely on the safeguards permitted by applicable law.

## 5. How long we keep data
- Account data: while your account is open; deleted or anonymised within 30 days after you ask us to close it, except data we must keep by law.
- Orders and invoices: kept for at least 5 years after the transaction to meet UAE commercial and tax record-keeping requirements.
- Contact form messages: up to 2 years.
- Password-reset links expire after 60 minutes; guest order links after 30 days.

## 6. Your rights
You can ask to access, correct, delete or receive a copy of your personal data, object to or restrict certain processing, and withdraw marketing consent. You can update your details and marketing choice in **My account**. For any other request email **{{supportEmail}}** from the address linked to your account; we reply within 30 days. You may also complain to the UAE Data Office or your local data protection authority.

## 7. Security
Passwords are hashed, connections are encrypted (HTTPS), access to customer data is limited to authorised staff, and admin changes are logged.

## 8. Cookies
See our [Cookie Policy](/policies/cookies).

## 9. Changes
We will post updates on this page and notify registered customers by email of significant changes.

_Last updated: {{updated}}_`,
  },
  {
    slug: "cookies", title: "Cookie Policy", sortOrder: 3,
    content: `{{brandName}} uses only **strictly necessary cookies**. We do not use analytics, advertising or social-media tracking cookies, so we do not ask for consent to tracking. You can review this at any time in [Cookie preferences](/cookie-preferences).

| Cookie | Purpose | Duration |
|---|---|---|
| authjs.session-token | Keeps you signed in to your account | Up to 14 days or until you sign out |
| authjs.csrf-token | Protects sign-in forms against cross-site request forgery | Session |
| authjs.callback-url | Returns you to the right page after signing in | Session |
| cart_id | Remembers the items in your bag | 60 days |
| currency | Remembers your chosen display/checkout currency | 1 year |
| locale | Remembers your language (English / Arabic) | 1 year |
| cookie_notice | Remembers that you have seen our cookie notice | 1 year |

Your payment provider may set its own cookies on its hosted payment page; these are governed by its own policy.

You can block or delete cookies in your browser settings, but the Store will not be able to keep you signed in or remember your bag.

If we ever add optional cookies (for example analytics), we will ask for your consent first and you will be able to change your choice on the Cookie preferences page.

_Last updated: {{updated}}_`,
  },
  {
    slug: "shipping", title: "Shipping and Delivery Policy", sortOrder: 4,
    content: `We deliver from Dubai, United Arab Emirates. Delivery fees and timeframes depend on your destination and are always shown at checkout before you pay.

## Delivery zones, fees and timeframes
{{deliveryTable}}

Timeframes are estimates in business days from order confirmation (orders confirmed before 2 pm GST on a business day are usually dispatched the same or next business day). Delivery is not available on public holidays in some areas.

## Delivery address
For UAE deliveries please give your emirate, area, building or villa, and an apartment/unit number or nearby landmark so the courier can find you. Our courier will call the phone number on your order before delivery. If delivery fails twice, the parcel is returned to us and we will contact you to rearrange delivery (a further delivery fee may apply).

## International deliveries
- Prices exclude any import duties, taxes or customs fees charged by the destination country; these are payable by the recipient.
- **Perfumes contain alcohol and are classed as flammable goods for transport.** Some couriers and countries restrict their shipment; if we cannot send a perfume to your address we will contact you and refund that item in full.
- Delivery times can be longer during customs clearance.

## Order tracking
When your order ships we email you a tracking number where available. You can also see the status in **My account > Orders** or via the link in your order email.

## Damaged or missing items
Please check your parcel on delivery and tell us within 48 hours at {{supportEmail}} with your order number and photos if anything is damaged, missing or incorrect.

_Last updated: {{updated}}_`,
  },
  {
    slug: "returns", title: "Returns, Refunds and Cancellations Policy", sortOrder: 5,
    content: `We want you to love your order. This policy explains when you can cancel, return or get a refund. It does not affect your statutory rights under UAE consumer protection law.

## Cancelling an order
You can cancel free of charge before your order is shipped by emailing {{supportEmail}} with your order number. Once shipped, please follow the return process below.

## Returns (change of mind)
You may return eligible items within **{{returnDays}} days** of delivery if they are **unused, unopened and in their original sealed packaging**.

For hygiene and safety reasons the following cannot be returned for change of mind:
- Perfumes, discovery sets and mists whose seal, cellophane or box has been opened or that have been sprayed.
- Press-on nail sets that have been opened, tried on or applied.
- Opened nail glue, cuticle oil, adhesive tabs and prep-kit consumables.
- Earrings (for hygiene), unless faulty.

Return delivery costs for change-of-mind returns are paid by the customer unless we agree otherwise.

## Faulty, damaged or incorrect items
If an item arrives damaged, faulty, leaking or is not what you ordered, contact us within **48 hours of delivery** with photos. We will offer a replacement or a full refund including the original delivery fee, and arrange collection at our cost.

## How to return
1. Email {{supportEmail}} with your order number, the items and the reason.
2. We will confirm whether the item is eligible and send return instructions.
3. Pack the item securely in its original packaging.

## Refunds
- Approved refunds are issued to the **original payment method, in the currency you paid**, within 7 business days of us receiving and checking the return. Your bank may take a further 5-14 business days to show it.
- Because refunds are made in the original currency, the amount in your home currency may differ slightly due to exchange-rate movements and your bank's fees.
- Original delivery fees are refunded only for faulty, damaged or incorrect items, or if we cancel your order.

## Unpaid orders
Orders that are not paid within 60 minutes are cancelled automatically and no payment is taken.

_Last updated: {{updated}}_`,
  },
  {
    slug: "contact", title: "Contact and Business Information", sortOrder: 6,
    content: `## Customer care
{{contactBlock}}

## Business information
- **Trading name:** {{brandName}}
- **Legal entity:** {{legalName}}
- **Trade licence no.:** {{tradeLicence}}
- **Issuing authority:** {{licenceAuthority}}
- **Registered address:** {{address}}
- **Website:** {{siteUrl}}
- **VAT:** {{taxStatement}}

For order questions, please include your order number (for example 21M-2600001). You can also use our [contact form](/contact).`,
  },
];
