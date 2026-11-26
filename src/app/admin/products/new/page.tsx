import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { ProductForm } from "@/components/admin/ProductForm";
export const metadata = { title: "New product" };
export default async function NewProduct() {
  await requireStaff();
  const cats = await db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  return <div className="max-w-3xl space-y-6"><Link href="/admin/products" className="text-sm text-muted hover:underline">← Products</Link><h1 className="h-display text-4xl">New product</h1><div className="card p-6"><ProductForm categories={cats} /></div></div>;
}
