import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveCategoryAction } from "../actions";

export const metadata = { title: "Categories" };
export default async function Categories() {
  await requireStaff();
  const cats = await db.select({ c: schema.categories, n: sql<number>`(select count(*) from products where category_id = ${schema.categories.id})::int` }).from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  const form = (c?: typeof schema.categories.$inferSelect) => (
    <ActionForm action={saveCategoryAction} submit={c ? "Save" : "Create category"} reset={!c} className="grid gap-3 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div><label className="label">Name</label><input name="name" defaultValue={c?.name} className="input" /></div>
      <div><label className="label">Arabic name</label><input name="nameAr" dir="rtl" defaultValue={c?.nameAr ?? ""} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><input name="description" defaultValue={c?.description} className="input" /></div>
      <div><label className="label">Image URL</label><input name="image" defaultValue={c?.image ?? ""} className="input" placeholder="/media/… or /products/…" /></div>
      <div><label className="label">Sort order</label><input name="sortOrder" type="number" min={0} defaultValue={c?.sortOrder ?? cats.length + 1} className="input" /></div>
    </ActionForm>
  );
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="h-display text-4xl">Categories</h1>
      {cats.map(({ c, n }) => <section key={c.id} className="card p-5"><h2 className="mb-3 font-medium">{c.name} <span className="text-xs text-muted">/{c.slug} · {n} products</span></h2>{form(c)}</section>)}
      <section className="card border-dashed p-5"><h2 className="mb-3 font-medium">New category</h2>{form()}</section>
    </div>
  );
}
