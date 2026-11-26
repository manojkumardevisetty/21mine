import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { formatMinor } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";
import { OrderBadge, PaymentBadge } from "@/components/OrderStatus";

export const metadata = { title: "Orders" };
const PAGE = 25;

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const o = schema.orders;
  const where: SQL[] = [];
  const q = (sp.q ?? "").trim();
  if (q) { const like = `%${q}%`; where.push(or(ilike(o.number, like), ilike(o.email, like), ilike(o.shipName, like), ilike(o.shipPhone, like), ilike(o.invoiceNumber, like))!); }
  if (sp.status && sp.status in ORDER_STATUS_LABEL) where.push(eq(o.status, sp.status as "CONFIRMED"));
  if (sp.payment && sp.payment in PAYMENT_STATUS_LABEL) where.push(eq(o.paymentStatus, sp.payment as "PAID"));
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) where.push(gte(o.createdAt, new Date(`${sp.from}T00:00:00+04:00`)));
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) where.push(lte(o.createdAt, new Date(`${sp.to}T23:59:59+04:00`)));
  if (sp.demo === "0") where.push(eq(o.isDemo, false));
  const page = Math.max(1, Number(sp.page) || 1);
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(o).where(cond).orderBy(desc(o.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: sql<number>`count(*)::int` }).from(o).where(cond),
  ]);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const qs = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), page: String(p) })}`;
  return (
    <div className="space-y-6">
      <h1 className="h-display text-4xl">Orders</h1>
      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="lg:col-span-2"><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Order #, email, name, phone, invoice #" /></div>
        <div><label className="label" htmlFor="status">Order status</label><select id="status" name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Any</option>{Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="payment">Payment</label><select id="payment" name="payment" defaultValue={sp.payment ?? ""} className="input"><option value="">Any</option>{Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={sp.from} className="input" /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={sp.to} className="input" /></div>
        <div className="flex items-end gap-2 lg:col-span-6"><button className="btn-primary btn-sm">Filter</button><Link href="/admin/orders" className="btn-ghost btn-sm">Reset</Link><span className="ms-auto text-sm text-muted">{n} order(s)</span></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream text-xs uppercase text-muted"><tr><th className="p-3 text-start">Order</th><th className="p-3 text-start">Customer</th><th className="p-3 text-start">Destination</th><th className="p-3 text-start">Total</th><th className="p-3 text-start">Status</th><th className="p-3 text-start">Placed (GST)</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-sand align-top">
                <td className="p-3"><Link href={`/admin/orders/${r.id}`} className="link font-medium">{r.number}</Link>{r.isDemo && <span className="chip ms-1 bg-rose-soft text-rose-deep">demo</span>}{r.invoiceNumber && <div className="text-xs text-muted">{r.invoiceNumber}</div>}</td>
                <td className="p-3">{r.shipName}<div className="text-xs text-muted">{r.email}{r.userId ? "" : " · guest"}</div></td>
                <td className="p-3 text-xs">{r.shipCity}, {r.shipRegion}, {r.shipCountry}</td>
                <td className="p-3">{formatMinor(r.totalMinor, r.currency, r.currencyExponent)}</td>
                <td className="p-3"><div className="flex flex-col gap-1"><OrderBadge s={r.status} /><PaymentBadge s={r.paymentStatus} /></div></td>
                <td className="p-3 text-xs">{r.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No orders match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
          {page > 1 && <Link href={qs(page - 1)} className="btn-ghost btn-sm">Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="btn-ghost btn-sm">Next</Link>}
        </nav>
      )}
    </div>
  );
}
