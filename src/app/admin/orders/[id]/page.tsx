import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { formatMinor } from "@/lib/money";
import { countryName } from "@/lib/countries";
import { invoiceEligible } from "@/lib/orders";
import { OrderBadge, PaymentBadge } from "@/components/OrderStatus";
import { ActionForm } from "@/components/admin/ActionForm";
import { addOrderNoteAction, cancelUnpaidOrderAction, refundOrderAction, resendConfirmationAction, saveTrackingAction, updateOrderStatusAction } from "../../actions";

const NEXT: Record<string, string[]> = { CONFIRMED: ["PROCESSING", "SHIPPED"], PROCESSING: ["SHIPPED"], SHIPPED: ["DELIVERED"] };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, payments: { with: { events: true }, orderBy: (p, { asc }) => [asc(p.createdAt)] }, history: { orderBy: (h, { desc }) => [desc(h.createdAt)] }, user: { columns: { id: true, name: true, email: true } } },
  });
  if (!o) notFound();
  const m = (v: number) => formatMinor(v, o.currency, o.currencyExponent);
  const next = o.paymentStatus === "PAID" ? NEXT[o.status] ?? [] : [];
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-muted hover:underline">← Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="h-display text-4xl">{o.number}</h1><p className="text-sm text-muted">{o.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} GST · {o.user ? <>Customer: {o.user.name}</> : "Guest checkout"} · {o.email}</p></div>
        <div className="flex flex-wrap gap-2"><OrderBadge s={o.status} /><PaymentBadge s={o.paymentStatus} />{o.isDemo && <span className="chip bg-rose-soft text-rose-deep">Demo / simulated</span>}</div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-display text-2xl">Items (purchase-time snapshot)</h2>
            <table className="mt-3 w-full text-sm"><tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-b border-sand"><td className="py-2">{i.productName}<div className="text-xs text-muted">{i.variantName} · {i.sku}</div></td><td className="py-2 text-end">{i.quantity} × {m(i.unitPriceMinor)}</td><td className="py-2 text-end">{m(i.lineTotalMinor)}</td></tr>
              ))}
            </tbody></table>
            <dl className="mt-3 ms-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{m(o.subtotalMinor)}</dd></div>
              {o.discountMinor > 0 && <div className="flex justify-between"><dt>Discount {o.discountCode}</dt><dd>-{m(o.discountMinor)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{m(o.shippingMinor)}</dd></div>
              {o.taxRateBps > 0 && <div className="flex justify-between"><dt>VAT {o.taxRateBps / 100}%</dt><dd>{m(o.taxMinor)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{m(o.totalMinor)}</dd></div>
              {o.currency !== "AED" && <div className="flex justify-between text-xs text-muted"><dt>≈ AED (rate {(o.fxRateMicros / 1e6).toFixed(6)})</dt><dd>{formatMinor(o.totalBaseFils, "AED")}</dd></div>}
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-2xl">Payments</h2>
            {o.payments.map((p) => (
              <div key={p.id} className="mt-3 rounded-xl bg-cream p-3 text-sm">
                <p><strong>{p.provider}</strong> · {p.method} · {formatMinor(p.amountMinor, p.currency, o.currencyExponent)} · <PaymentBadge s={p.status} /></p>
                <p className="text-xs text-muted">Ref {p.providerRef}{p.refundedMinor ? ` · refunded ${formatMinor(p.refundedMinor, p.currency, o.currencyExponent)}` : ""}</p>
                {p.events.length > 0 && <ul className="mt-1 text-xs text-muted">{p.events.map((e) => <li key={e.id}>{e.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC - {e.type} ({e.providerEventId})</li>)}</ul>}
              </div>
            ))}
          </section>
          <section className="card p-5">
            <h2 className="font-display text-2xl">History</h2>
            <ActionForm action={addOrderNoteAction} submit="Add note" reset className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="orderId" value={o.id} />
              <label className="sr-only" htmlFor="note">Internal note</label>
              <input id="note" name="note" className="input flex-1" placeholder="Internal note (visible to customer in order history)" maxLength={500} />
            </ActionForm>
            <ol className="mt-4 space-y-2 text-sm">{o.history.map((h) => <li key={h.id}><span className="text-xs text-muted">{h.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} · {h.actor}</span><br />{h.message}</li>)}</ol>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card space-y-3 p-5 text-sm">
            <h2 className="font-display text-xl">Ship to</h2>
            <address className="not-italic leading-6">{o.shipName}<br />{o.shipPhone}<br />{o.shipBuilding}{o.shipUnit ? `, ${o.shipUnit}` : ""}<br />{[o.shipStreet, o.shipCity].filter(Boolean).join(", ")}<br />{o.shipRegion} {o.shipPostalCode ?? ""}, {countryName(o.shipCountry)}{o.shipLandmark && <><br />Landmark: {o.shipLandmark}</>}</address>
            {o.deliveryNotes && <p className="rounded-lg bg-cream p-2">Notes: {o.deliveryNotes}</p>}
            {invoiceEligible(o) && <a href={`/api/invoices/${o.id}`} className="btn-secondary btn-sm">Download invoice {o.invoiceNumber}</a>}
          </section>
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-xl">Fulfilment</h2>
            {next.length > 0 ? (
              <ActionForm action={updateOrderStatusAction} submit="Update status">
                <input type="hidden" name="orderId" value={o.id} />
                <div><label className="label" htmlFor="st">New status</label><select id="st" name="status" className="input">{next.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="label" htmlFor="tr">Tracking number</label><input id="tr" name="trackingNumber" defaultValue={o.trackingNumber ?? ""} className="input" placeholder="Required when shipping" /></div>
                <p className="text-xs text-muted">Shipped and Delivered send an email to the customer.</p>
              </ActionForm>
            ) : <p className="text-sm text-muted">{o.paymentStatus !== "PAID" ? "Fulfilment unlocks once payment is confirmed." : "No further status changes."}</p>}
            {o.status === "SHIPPED" || o.status === "DELIVERED" ? (
              <ActionForm action={saveTrackingAction} submit="Save tracking" submitClass="btn-ghost btn-sm">
                <input type="hidden" name="orderId" value={o.id} /><input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} className="input" aria-label="Tracking number" />
              </ActionForm>
            ) : null}
            {o.paymentStatus === "PAID" && <ActionForm action={resendConfirmationAction} submit="Resend confirmation email" submitClass="btn-ghost btn-sm"><input type="hidden" name="orderId" value={o.id} /></ActionForm>}
          </section>
          {o.paymentStatus === "PAID" && (
            <section className="card space-y-3 border-danger/30 p-5">
              <h2 className="font-display text-xl text-danger">Refund</h2>
              <ActionForm action={refundOrderAction} submit={`Refund ${m(o.totalMinor)}`} submitClass="btn-danger btn-sm" confirmText="Issue a full refund to the customer's original payment method?">
                <input type="hidden" name="orderId" value={o.id} />
                <div><label className="label" htmlFor="rs">Reason</label><input id="rs" name="reason" className="input" required /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" defaultChecked={o.status !== "SHIPPED" && o.status !== "DELIVERED"} /> Return items to stock</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancel" defaultChecked={o.status !== "DELIVERED"} /> Cancel the order</label>
                <div><label className="label" htmlFor="cf">Type REFUND to confirm</label><input id="cf" name="confirm" className="input" autoComplete="off" /></div>
              </ActionForm>
            </section>
          )}
          {o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && o.paymentStatus !== "REFUNDED" && (
            <section className="card p-5">
              <ActionForm action={cancelUnpaidOrderAction} submit="Cancel unpaid order" submitClass="btn-ghost btn-sm text-danger" confirmText="Cancel this unpaid order and release its stock?">
                <input type="hidden" name="orderId" value={o.id} />
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
