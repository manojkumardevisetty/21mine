import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/authz";
import { countryName } from "@/lib/countries";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/account";
import { AccountShell } from "@/components/account/AccountShell";
import { Alert } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Addresses({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser("/account/addresses");
  const { saved } = await searchParams;
  const list = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault), asc(schema.addresses.createdAt));
  return (
    <AccountShell title="Addresses" active="/account/addresses">
      {saved && <div className="mb-4"><Alert kind="success">Address saved.</Alert></div>}
      <Link href="/account/addresses/new" className="btn-primary">Add address</Link>
      {list.length === 0 ? <p className="mt-6 text-muted">You haven't saved any addresses yet.</p> : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="card p-5 text-sm">
              <p className="font-medium">{a.label} {a.isDefault && <span className="chip ms-1 bg-charcoal text-ivory">Default</span>}</p>
              <address className="mt-2 not-italic leading-6 text-muted">{a.fullName}<br />{a.building}{a.unit ? `, ${a.unit}` : ""}<br />{[a.street, a.city].filter(Boolean).join(", ")}<br />{a.region}{a.postalCode ? ` ${a.postalCode}` : ""}, {countryName(a.country)}<br />{a.phone}</address>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/account/addresses/${a.id}`} className="btn-secondary btn-sm">Edit</Link>
                {!a.isDefault && <form action={setDefaultAddressAction}><input type="hidden" name="id" value={a.id} /><SubmitButton className="btn-ghost btn-sm">Make default</SubmitButton></form>}
                <form action={deleteAddressAction}><input type="hidden" name="id" value={a.id} /><SubmitButton className="btn-ghost btn-sm text-danger" pendingText="Deleting…">Delete</SubmitButton></form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
