import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/authz";
import { ordersForUser } from "@/lib/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderList } from "@/components/account/OrderList";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await requireUser("/account");
  const [orders, addr] = await Promise.all([
    ordersForUser(user.id, 3),
    db.query.addresses.findFirst({ where: eq(schema.addresses.userId, user.id), orderBy: (a, { desc }) => [desc(a.isDefault)] }),
  ]);
  return (
    <AccountShell title={`Hello, ${user.name.split(" ")[0]}`} active="/account">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Recent orders</h2><Link href="/account/orders" className="link text-sm">All orders</Link></div>
          <div className="mt-4"><OrderList orders={orders} /></div>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-xl">Default address</h2>
          {addr ? <p className="mt-2 text-sm text-muted">{addr.fullName}<br />{addr.building}, {addr.city}, {addr.region}</p> : <p className="mt-2 text-sm text-muted">No saved address yet.</p>}
          <Link href="/account/addresses" className="link mt-3 inline-block text-sm">Manage addresses</Link>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-xl">Details</h2>
          <p className="mt-2 text-sm text-muted">{user.name}<br />{user.email}</p>
          <Link href="/account/settings" className="link mt-3 inline-block text-sm">Edit settings</Link>
        </section>
      </div>
    </AccountShell>
  );
}
