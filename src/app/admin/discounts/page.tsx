import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { formatMinor } from "@/lib/money";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveDiscountAction } from "../actions";

export const metadata = { title: "Discounts" };
export default async function Discounts() {
  await requireStaff();
  const list = await db.select().from(schema.discountCodes).orderBy(desc(schema.discountCodes.createdAt));
  const form = (d?: typeof schema.discountCodes.$inferSelect) => (
    <ActionForm action={saveDiscountAction} submit={d ? "Save" : "Create code"} reset={!d} className="grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div><label className="label text-xs">Code</label><input name="code" defaultValue={d?.code} className="input uppercase" /></div>
      <div><label className="label text-xs">Type</label><select name="type" defaultValue={d?.type ?? "PERCENT"} className="input"><option value="PERCENT">% off</option><option value="FIXED">AED off</option></select></div>
      <div><label className="label text-xs">Value</label><input name="value" defaultValue={d ? (d.type === "PERCENT" ? d.value : (d.value / 100).toFixed(2)) : ""} className="input" /></div>
      <div><label className="label text-xs">Min spend AED</label><input name="minSubtotal" defaultValue={d?.minSubtotalFils ? (d.minSubtotalFils / 100).toFixed(2) : ""} className="input" /></div>
      <div><label className="label text-xs">Max uses</label><input name="maxUses" defaultValue={d?.maxUses ?? ""} className="input" placeholder="∞" /></div>
      <div><label className="label text-xs">Expires (GST)</label><input name="expiresAt" type="date" defaultValue={d?.expiresAt?.toISOString().slice(0, 10)} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={d?.isActive ?? true} /> Active</label>
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <h1 className="h-display text-4xl">Discount codes</h1>
      <p className="text-sm text-muted">Percent codes apply to the item subtotal in the customer's currency; fixed codes are in AED and converted.</p>
      <section className="card border-dashed p-5"><h2 className="mb-3 font-medium">New code</h2>{form()}</section>
      {list.map((d) => (
        <section key={d.id} className="card p-5"><p className="mb-2 text-sm"><strong>{d.code}</strong> · used {d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""} · {d.type === "PERCENT" ? `${d.value}%` : formatMinor(d.value, "AED")}</p>{form(d)}</section>
      ))}
      {list.length === 0 && <p className="text-muted">No discount codes yet.</p>}
    </div>
  );
}
