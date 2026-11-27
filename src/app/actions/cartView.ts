"use server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadCart, readCartId } from "@/lib/cart";
import { currentCurrency } from "@/lib/currency";
import { convertFils, formatMinor } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export type CartView = {
  count: number;
  lines: { id: string; name: string; variant: string; slug: string; image: string | null; qty: number; max: number; unit: string; compareAt: string | null; total: string; problem: string | null }[];
  subtotal: string;
  freeShipping: { threshold: string; remaining: string | null; pct: number } | null;
  suggestions: { slug: string; name: string; image: string | null; price: string }[];
};

/** Cart contents for the slide-out drawer, priced in the visitor's currency. */
export async function getCartView(): Promise<CartView> {
  const [cart, cur, s] = await Promise.all([loadCart(await readCartId()), currentCurrency(), getSettings()]);
  const fmt = (fils: number) => formatMinor(convertFils(fils, cur), cur.code, cur.exponent);
  const subtotalFils = cart.lines.reduce((a, l) => a + l.unitPriceFils * l.quantity, 0);
  const thresholds = s.deliveryZones.filter((z) => z.enabled && z.country === "AE" && z.freeOverFils).map((z) => z.freeOverFils!);
  const threshold = thresholds.length ? Math.min(...thresholds) : null;
  const variantIds = cart.lines.map((l) => l.variantId);
  const compare = variantIds.length
    ? await db.select({ id: schema.variants.id, c: schema.variants.compareAtFils }).from(schema.variants).where(inArray(schema.variants.id, variantIds))
    : [];
  const inCart = new Set(cart.lines.map((l) => l.productSlug));
  const sugg = await db.query.products.findMany({
    where: and(eq(schema.products.isPublished, true), eq(schema.products.isFeatured, true)),
    with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 }, variants: { where: (v, { eq }) => eq(v.isActive, true), orderBy: (v, { asc }) => [asc(v.priceFils)], limit: 1 } },
    orderBy: [desc(schema.products.isFeatured), asc(schema.products.name)], limit: 8,
  });
  return {
    count: cart.count,
    lines: cart.lines.map((l) => {
      const c = compare.find((x) => x.id === l.variantId)?.c ?? null;
      return {
        id: l.id, name: l.productName, variant: l.variantName, slug: l.productSlug, image: l.image, qty: l.quantity,
        max: l.available ? Math.min(10, l.stock) : 0, unit: fmt(l.unitPriceFils), compareAt: c && c > l.unitPriceFils ? fmt(c) : null,
        total: fmt(l.unitPriceFils * l.quantity), problem: l.problem,
      };
    }),
    subtotal: fmt(subtotalFils),
    freeShipping: threshold ? { threshold: fmt(threshold), remaining: subtotalFils >= threshold ? null : fmt(threshold - subtotalFils), pct: Math.min(100, Math.round((subtotalFils / threshold) * 100)) } : null,
    suggestions: sugg.filter((p) => !inCart.has(p.slug) && p.variants[0]).slice(0, 4).map((p) => ({ slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, price: fmt(p.variants[0].priceFils) })),
  };
}
