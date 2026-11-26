import { desc, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { formatMinor } from "@/lib/money";
import { setRoleAction } from "../actions";

export const metadata = { title: "Customers" };
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireStaff();
  const q = ((await searchParams).q ?? "").trim();
  const u = schema.users;
  const rows = await db.select({
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, marketing: u.marketingOptIn, createdAt: u.createdAt,
    orders: sql<number>`(select count(*) from orders where user_id = ${u.id} and payment_status = 'PAID')::int`,
    spent: sql<number>`(select coalesce(sum(total_base_fils),0) from orders where user_id = ${u.id} and payment_status = 'PAID')::int`,
  }).from(u).where(q ? or(ilike(u.email, `%${q}%`), ilike(u.name, `%${q}%`), ilike(u.phone, `%${q}%`)) : undefined).orderBy(desc(u.createdAt)).limit(200);
  return (
    <div className="space-y-6">
      <h1 className="h-display text-4xl">Customers & staff</h1>
      <form role="search" className="flex gap-2"><label htmlFor="q" className="sr-only">Search</label><input id="q" name="q" defaultValue={q} className="input max-w-sm" placeholder="Name, email or phone" /><button className="btn-secondary btn-sm">Search</button></form>
      <div className="card overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-cream text-xs uppercase text-muted"><tr><th className="p-3 text-start">Name</th><th className="p-3 text-start">Contact</th><th className="p-3 text-start">Paid orders</th><th className="p-3 text-start">Spent (AED)</th><th className="p-3 text-start">Marketing</th><th className="p-3 text-start">Role</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="border-t border-sand">
            <td className="p-3">{r.name}<div className="text-xs text-muted">since {r.createdAt.toLocaleDateString("en-GB")}</div></td>
            <td className="p-3">{r.email}<div className="text-xs text-muted">{r.phone}</div></td>
            <td className="p-3">{r.orders}</td><td className="p-3">{formatMinor(r.spent, "AED")}</td>
            <td className="p-3">{r.marketing ? "Opted in" : "-"}</td>
            <td className="p-3">{me.role === "ADMIN" && r.id !== me.id ? (
              <form action={setRoleAction} className="flex gap-1"><input type="hidden" name="id" value={r.id} />
                <select name="role" defaultValue={r.role} className="rounded border border-sand bg-white p-1 text-xs" aria-label={`Role for ${r.email}`}><option>CUSTOMER</option><option>STAFF</option><option>ADMIN</option></select>
                <button className="text-xs underline">Set</button></form>
            ) : r.role}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <p className="text-xs text-muted">STAFF can manage products, orders, discounts and reviews. ADMIN can also change settings, currencies, policies and roles. Role changes sign the user out.</p>
    </div>
  );
}
