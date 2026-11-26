import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/authz";
import { canViewOrder, invoiceEligible } from "@/lib/orders";
import { formatMinor } from "@/lib/money";
import { countryName } from "@/lib/countries";
import { createOrderToken } from "@/lib/tokens";
import { retryPaymentAction } from "@/app/actions/payment";
import { OrderBadge, PaymentBadge } from "@/components/OrderStatus";
import { Alert } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; from?: string; error?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.number, decodeURIComponent(number)),
    with: { items: true, history: { orderBy: (h, { asc }) => [asc(h.createdAt)] } },
  });
  const user = await getUser();
  // Same 404 for "doesn't exist" and "not yours" so order numbers can't be probed.
  if (!o || !canViewOrder(o, user, sp.t)) notFound();
  const m = (v: number) => formatMinor(v, o.currency, o.currencyExponent);
  const token = sp.t && !user ? sp.t : createOrderToken(o.id);
  const fresh = sp.from === "payment";
  const stepIdx = STEPS.indexOf(o.status);

  return (
    <div className="container-x max-w-4xl py-10">
      {fresh && o.paymentStatus === "PAID" && (
        <div className="mb-8 rounded-3xl bg-cream p-8 text-center">
          <p className="text-4xl" aria-hidden="true">✓</p>
          <h1 className="h-display mt-2 text-4xl">Thank you - your order is confirmed</h1>
          <p className="mt-2 text-muted">We've emailed a confirmation to <strong>{o.email}</strong>.{o.isDemo && " This was a simulated payment - no money was collected."}</p>
        </div>
      )}
      {fresh && o.paymentStatus === "FAILED" && <div className="mb-6"><Alert kind="error" title="Your payment was declined">No money was taken. Your items are reserved for 60 minutes - you can try again below.</Alert></div>}
      {fresh && o.paymentStatus === "CANCELLED" && <div className="mb-6"><Alert kind="info" title="Payment cancelled">Your order has been cancelled and no payment was taken. Your bag items were released.</Alert></div>}
      {sp.error && <div className="mb-6"><Alert kind="error">{sp.error}</Alert></div>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Order</p>
          <h2 className="h-display text-3xl">{o.number}</h2>
          <p className="text-sm text-muted">Placed {o.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })} (GST)</p>
        </div>
        <div className="flex flex-wrap gap-2"><OrderBadge s={o.status} /><PaymentBadge s={o.paymentStatus} />{o.isDemo && <span className="chip bg-rose-soft text-rose-deep">Demo order</span>}</div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {invoiceEligible(o) ? (
          <a href={`/api/invoices/${o.id}?t=${encodeURIComponent(token)}`} className="btn-primary" download>Download {o.isDemo ? "sample " : ""}invoice (PDF)</a>
        ) : (
          <p className="text-sm text-muted">The invoice will be available once payment is confirmed.</p>
        )}
        {o.status === "PENDING_PAYMENT" && (o.paymentStatus === "FAILED" || o.paymentStatus === "PENDING") && (
          <form action={retryPaymentAction}>
            <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="t" value={token} />
            <SubmitButton className="btn-rose" pendingText="Opening payment…">{o.paymentStatus === "FAILED" ? "Try payment again" : "Complete payment"}</SubmitButton>
          </form>
        )}
      </div>

      {o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT" && (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center text-xs" aria-current={i === stepIdx ? "step" : undefined}>
              <div className={`h-1.5 rounded-full ${i <= stepIdx ? "bg-charcoal" : "bg-sand"}`} />
              <p className={`mt-2 ${i <= stepIdx ? "" : "text-muted"}`}>{["Confirmed", "Processing", "Shipped", "Delivered"][i]}</p>
            </li>
          ))}
        </ol>
      )}
      {o.trackingNumber && <p className="mt-4 text-sm">Tracking number: <strong>{o.trackingNumber}</strong></p>}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_300px]">
        <section aria-labelledby="items-h">
          <h3 id="items-h" className="font-display text-2xl">Items</h3>
          <ul className="mt-4 divide-y divide-sand border-y border-sand">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image && <img src={i.image} alt="" className="h-20 w-16 rounded-lg object-cover" />}
                <div className="flex-1 text-sm">
                  <Link href={`/product/${i.productSlug}`} className="font-medium hover:underline">{i.productName}</Link>
                  <p className="text-muted">{i.variantName} · {i.sku}</p>
                  <p className="text-muted">{i.quantity} × {m(i.unitPriceMinor)}</p>
                </div>
                <p className="text-sm">{m(i.lineTotalMinor)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotalMinor)}</dd></div>
            {o.discountMinor > 0 && <div className="flex justify-between text-ok"><dt>Discount ({o.discountCode})</dt><dd>-{m(o.discountMinor)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{o.shippingMinor ? m(o.shippingMinor) : "Free"}</dd></div>
            {o.taxRateBps > 0 && <div className="flex justify-between text-muted"><dt>VAT {(o.taxRateBps / 100).toFixed(0)}%{o.merchantSnapshot.pricesIncludeTax ? " (included)" : ""}</dt><dd>{m(o.taxMinor)}</dd></div>}
            <div className="flex justify-between border-t border-sand pt-2 text-base font-semibold"><dt>Total ({o.currency})</dt><dd>{m(o.totalMinor)}</dd></div>
          </dl>
        </section>
        <aside className="space-y-6 text-sm">
          <div>
            <h3 className="font-display text-xl">Delivery address</h3>
            <address className="mt-2 not-italic leading-6 text-muted">
              {o.shipName}<br />{o.shipBuilding}{o.shipUnit ? `, ${o.shipUnit}` : ""}<br />
              {[o.shipStreet, o.shipCity].filter(Boolean).join(", ")}<br />
              {[o.shipRegion, o.shipPostalCode].filter(Boolean).join(" ")}, {countryName(o.shipCountry)}<br />
              {o.shipLandmark && <>Near {o.shipLandmark}<br /></>}{o.shipPhone}
            </address>
          </div>
          <div>
            <h3 className="font-display text-xl">History</h3>
            <ol className="mt-2 space-y-2 text-muted">
              {o.history.map((h) => <li key={h.id}><span className="block text-xs">{h.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" })}</span>{h.message}</li>)}
            </ol>
          </div>
          <p className="text-muted">Need help? Email <a className="link" href={`mailto:support@21mine.shop?subject=Order ${o.number}`}>support@21mine.shop</a> with your order number.</p>
          {!user && <p className="text-xs text-muted">Keep this page's link (from your confirmation email) to view your order again. It expires after 30 days.</p>}
        </aside>
      </div>
    </div>
  );
}
