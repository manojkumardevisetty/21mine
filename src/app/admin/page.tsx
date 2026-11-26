import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { getSettings, missingMerchantInfo } from "@/lib/settings";
import { formatMinor } from "@/lib/money";
import { env, isDemo } from "@/lib/env";
import { expireStaleOrders } from "@/lib/payments/apply";
import { OrderBadge, PaymentBadge } from "@/components/OrderStatus";

export default async function Dashboard() {
  await requireStaff();
  await expireStaleOrders().catch(() => 0);
  const since = new Date(Date.now() - 30 * 86400_000);
  const today = new Date(new Date().toDateString());
  const o = schema.orders;
  const [[stats], [todayStats], lowStock, recent, s, policies, pendingReviews, openMsgs] = await Promise.all([
    db.select({ revenue: sql<number>`coalesce(sum(${o.totalBaseFils}) filter (where ${o.paymentStatus} = 'PAID'),0)::int`, paid: sql<number>`count(*) filter (where ${o.paymentStatus} = 'PAID')::int`,
      toFulfil: sql<number>`count(*) filter (where ${o.status} in ('CONFIRMED','PROCESSING'))::int` }).from(o).where(gte(o.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(o).where(and(gte(o.createdAt, today), eq(o.paymentStatus, "PAID"))),
    db.select({ id: schema.variants.id, sku: schema.variants.sku, name: schema.variants.name, stock: schema.variants.stock, productId: schema.variants.productId, product: schema.products.name })
      .from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).where(and(lte(schema.variants.stock, 5), eq(schema.variants.isActive, true))).orderBy(schema.variants.stock).limit(10),
    db.select().from(o).orderBy(desc(o.createdAt)).limit(8),
    getSettings(),
    db.select({ slug: schema.policyPages.slug, title: schema.policyPages.title }).from(schema.policyPages).where(eq(schema.policyPages.needsReview, true)),
    db.$count(schema.reviews, eq(schema.reviews.status, "PENDING")),
    db.$count(schema.contactMessages, eq(schema.contactMessages.handled, false)),
  ]);
  const missing = missingMerchantInfo(s);
  const unconfirmed = ["deliveryZones", "returnWindowDays", "paymentProviderName", "legalName", "businessAddress"].filter((k) => !s.confirmedFields.includes(k));
  const checklist = [
    ...missing.map((m) => ({ ok: false, text: `${m.label}: ${m.reason}`, href: "/admin/settings" })),
    ...policies.map((p) => ({ ok: false, text: `Policy needs legal review & approval: ${p.title}`, href: `/admin/policies/${p.slug}` })),
    ...(unconfirmed.length ? [{ ok: false, text: `Merchant hasn't confirmed: ${unconfirmed.join(", ")}`, href: "/admin/settings" }] : []),
    { ok: !isDemo(), text: isDemo() ? "Store is in demo mode (simulated payments)" : "Store is in production mode", href: "/admin/settings" },
    { ok: env.paymentProvider !== "simulated", text: env.paymentProvider === "simulated" ? "No live payment gateway connected" : `Payment provider: ${env.paymentProvider}`, href: "/admin/settings" },
    { ok: !!process.env.SMTP_HOST, text: process.env.SMTP_HOST ? "SMTP email configured" : "SMTP not configured - emails go to the Outbox only", href: "/admin/outbox" },
  ];
  return (
    <div className="space-y-8">
      <h1 className="h-display text-4xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Paid revenue (30 days)", formatMinor(stats.revenue, "AED")], ["Paid orders (30 days)", stats.paid], ["Paid orders today", todayStats.n], ["To fulfil", stats.toFulfil]].map(([k, v]) => (
          <div key={k} className="card p-5"><p className="text-xs uppercase tracking-wider text-muted">{k}</p><p className="mt-2 font-display text-3xl">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-2xl">Launch checklist</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2"><span aria-hidden="true" className={c.ok ? "text-ok" : "text-warn"}>{c.ok ? "✓" : "!"}</span>
                <Link href={c.href} className="hover:underline">{c.text}</Link><span className="sr-only">{c.ok ? "done" : "action needed"}</span></li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-2xl">Needs attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/admin/orders?status=CONFIRMED" className="link">{stats.toFulfil} order(s) to fulfil</Link></li>
            <li><Link href="/admin/reviews" className="link">{pendingReviews} review(s) awaiting moderation</Link></li>
            <li><Link href="/admin/messages" className="link">{openMsgs} unhandled message(s)</Link></li>
          </ul>
          <h3 className="mt-5 font-medium">Low stock (≤ 5)</h3>
          {lowStock.length === 0 ? <p className="text-sm text-muted">All good.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{lowStock.map((v) => <li key={v.id}><Link href={`/admin/products/${v.productId}`} className="hover:underline">{v.product} - {v.name}</Link> <span className={v.stock === 0 ? "text-danger" : "text-warn"}>({v.stock})</span></li>)}</ul>
          )}
        </section>
      </div>
      <section>
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Recent orders</h2><Link href="/admin/orders" className="link text-sm">All orders</Link></div>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream text-start text-xs uppercase text-muted"><tr><th className="p-3 text-start">Order</th><th className="p-3 text-start">Customer</th><th className="p-3 text-start">Total</th><th className="p-3 text-start">Status</th><th className="p-3 text-start">Date</th></tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id} className="border-t border-sand"><td className="p-3"><Link href={`/admin/orders/${r.id}`} className="link">{r.number}</Link></td><td className="p-3">{r.shipName}<br /><span className="text-xs text-muted">{r.email}</span></td>
                <td className="p-3">{formatMinor(r.totalMinor, r.currency, r.currencyExponent)}</td><td className="p-3"><div className="flex flex-wrap gap-1"><OrderBadge s={r.status} /><PaymentBadge s={r.paymentStatus} /></div></td><td className="p-3 text-xs">{r.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "short", timeStyle: "short" })}</td></tr>
            ))}{recent.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No orders yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
