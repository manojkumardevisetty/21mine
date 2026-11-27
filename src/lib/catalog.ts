import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

const { products: p, variants: v, categories: c, productImages: img, reviews: r } = schema;

const minPrice = sql<number>`(select min(${v.priceFils}) from ${v} where ${v.productId} = ${p.id} and ${v.isActive})`;
const maxCompare = sql<number | null>`(select max(${v.compareAtFils}) from ${v} where ${v.productId} = ${p.id} and ${v.isActive})`;
const totalStock = sql<number>`coalesce((select sum(${v.stock}) from ${v} where ${v.productId} = ${p.id} and ${v.isActive}), 0)::int`;
const sizes = sql<string>`(select string_agg(${v.name}, ' / ' order by ${v.sortOrder}) from ${v} where ${v.productId} = ${p.id} and ${v.isActive})`;
const variantCount = sql<number>`(select count(*) from ${v} where ${v.productId} = ${p.id} and ${v.isActive})::int`;
const firstImage = sql<string | null>`(select ${img.url} from ${img} where ${img.productId} = ${p.id} order by ${img.sortOrder} limit 1)`;
const secondImage = sql<string | null>`(select ${img.url} from ${img} where ${img.productId} = ${p.id} order by ${img.sortOrder} offset 1 limit 1)`;
const avgRating = sql<number | null>`(select avg(${r.rating})::float from ${r} where ${r.productId} = ${p.id} and ${r.status} = 'APPROVED')`;
const reviewCount = sql<number>`(select count(*) from ${r} where ${r.productId} = ${p.id} and ${r.status} = 'APPROVED')::int`;

export type ProductFilters = {
  category?: string; q?: string; minFils?: number; maxFils?: number; inStock?: boolean;
  sort?: "featured" | "price_asc" | "price_desc" | "newest" | "name";
};

export async function listProducts(f: ProductFilters = {}) {
  const where: SQL[] = [eq(p.isPublished, true)];
  if (f.category) where.push(eq(c.slug, f.category));
  if (f.q) {
    const q = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where.push(or(ilike(p.name, q), ilike(p.shortDescription, q), ilike(p.description, q), ilike(c.name, q),
      sql`exists (select 1 from ${v} where ${v.productId} = ${p.id} and ${v.sku} ilike ${q})`)!);
  }
  if (f.minFils !== undefined) where.push(sql`${minPrice} >= ${f.minFils}`);
  if (f.maxFils !== undefined) where.push(sql`${minPrice} <= ${f.maxFils}`);
  if (f.inStock) where.push(sql`${totalStock} > 0`);
  where.push(sql`${variantCount} > 0`);

  const order = {
    featured: [desc(p.isFeatured), asc(c.sortOrder), asc(p.name)],
    price_asc: [asc(minPrice), asc(p.name)],
    price_desc: [desc(minPrice), asc(p.name)],
    newest: [desc(p.createdAt), asc(p.name)],
    name: [asc(p.name)],
  }[f.sort ?? "featured"];

  return db.select({
    id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, kind: p.kind,
    isFeatured: p.isFeatured, categorySlug: c.slug, categoryName: c.name,
    minPriceFils: minPrice, compareAtFils: maxCompare, stock: totalStock, variantCount, sizes,
    image: firstImage, hoverImage: secondImage, rating: avgRating, reviewCount,
  }).from(p).innerJoin(c, eq(p.categoryId, c.id)).where(and(...where)).orderBy(...order);
}
export type ProductListItem = Awaited<ReturnType<typeof listProducts>>[number];

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(p.slug, slug), eq(p.isPublished, true)),
    with: {
      category: true,
      images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
      variants: { where: (vv, { eq }) => eq(vv.isActive, true), orderBy: (vv, { asc }) => [asc(vv.sortOrder)] },
    },
  });
  if (!product || product.variants.length === 0) return null;
  return product;
}

export async function getProductReviews(productId: string) {
  const list = await db.select({
    id: r.id, rating: r.rating, title: r.title, body: r.body, displayName: r.displayName, createdAt: r.createdAt,
  }).from(r).where(and(eq(r.productId, productId), eq(r.status, "APPROVED"))).orderBy(desc(r.createdAt)).limit(50);
  const avg = list.length ? list.reduce((s, x) => s + x.rating, 0) / list.length : 0;
  return { list, avg, count: list.length };
}

export async function listCategories() {
  return db.select().from(c).orderBy(asc(c.sortOrder));
}

export async function getCategory(slug: string) {
  return db.query.categories.findFirst({ where: eq(c.slug, slug) });
}
