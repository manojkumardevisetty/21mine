import Link from "next/link";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { formatMinor } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const q = ((await searchParams).q ?? "").trim();
  const p = schema.products, v = schema.variants;
  const rows = await db.select({
    id: p.id, name: p.name, slug: p.slug, isPublished: p.isPublished, isFeatured: p.isFeatured, category: schema.categories.name,
    minPrice: sql<number | null>`(select min(${v.priceFils}) from ${v} where ${v.productId} = ${p.id})`,
    stock: sql<number>`coalesce((select sum(${v.stock}) from ${v} where ${v.productId} = ${p.id} and ${v.isActive}),0)::int`,
    variants: sql<number>`(select count(*) from ${v} where ${v.productId} = ${p.id})::int`,
    image: sql<string | null>`(select url from product_images where product_id = ${p.id} order by sort_order limit 1)`,
  }).from(p).innerJoin(schema.categories, eq(schema.categories.id, p.categoryId))
    .where(q ? or(ilike(p.name, `%${q}%`), sql`exists (select 1 from ${v} where ${v.productId} = ${p.id} and ${v.sku} ilike ${`%${q}%`})`) : undefined)
    .orderBy(asc(schema.categories.sortOrder), asc(p.name));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="h-display text-4xl">Products</h1><Link href="/admin/products/new" className="btn-primary btn-sm">New product</Link></div>
      <form role="search" className="flex gap-2"><label htmlFor="q" className="sr-only">Search products</label><input id="q" name="q" defaultValue={q} className="input max-w-sm" placeholder="Search name or SKU" /><button className="btn-secondary btn-sm">Search</button></form>
      <div className="card overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-cream text-xs uppercase text-muted"><tr><th className="p-3 text-start">Product</th><th className="p-3 text-start">Category</th><th className="p-3 text-start">From</th><th className="p-3 text-start">Stock</th><th className="p-3 text-start">Status</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="border-t border-sand">
            <td className="p-3"><Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 hover:underline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image ? <img src={r.image} alt="" className="h-12 w-10 rounded object-cover" /> : <span className="h-12 w-10 rounded bg-cream" />}<span>{r.name}<span className="block text-xs text-muted">{r.variants} variant(s)</span></span></Link></td>
            <td className="p-3">{r.category}</td>
            <td className="p-3">{r.minPrice ? formatMinor(r.minPrice, "AED") : "-"}</td>
            <td className={`p-3 ${r.stock === 0 ? "text-danger" : r.stock <= 5 ? "text-warn" : ""}`}>{r.stock}</td>
            <td className="p-3"><span className={`chip ${r.isPublished ? "bg-ok/10 text-ok" : "bg-sand text-muted"}`}>{r.isPublished ? "Published" : "Draft"}</span>{r.isFeatured && <span className="chip ms-1 bg-rose-soft text-rose-deep">Featured</span>}</td>
          </tr>
        ))}{rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No products found.</td></tr>}</tbody>
      </table></div>
    </div>
  );
}
