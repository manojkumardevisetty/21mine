import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";

export const CART_COOKIE = "cart_id";
export const MAX_QTY_PER_LINE = 10;

export async function readCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

/** Only callable from Server Actions / Route Handlers (sets a cookie). */
export async function ensureCartId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) {
    const row = await db.query.carts.findFirst({ where: eq(schema.carts.id, existing), columns: { id: true } });
    if (row) return row.id;
  }
  const [cart] = await db.insert(schema.carts).values({}).returning({ id: schema.carts.id });
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
  return cart.id;
}

export type CartLine = Awaited<ReturnType<typeof loadCart>>["lines"][number];

export async function loadCart(cartId: string | null) {
  if (!cartId) return { cartId: null, lines: [], count: 0 };
  const items = await db.query.cartItems.findMany({
    where: eq(schema.cartItems.cartId, cartId),
    with: { variant: { with: { product: { with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 } } } } } },
    orderBy: (c, { asc }) => [asc(c.id)],
  });
  const lines = items.map((i) => {
    const v = i.variant;
    const p = v.product;
    const available = p.isPublished && v.isActive;
    return {
      id: i.id, variantId: v.id, quantity: i.quantity, sku: v.sku,
      productName: p.name, productSlug: p.slug, variantName: v.name, options: v.options,
      image: p.images[0]?.url ?? null, imageAlt: p.images[0]?.alt ?? p.name,
      unitPriceFils: v.priceFils, stock: v.stock, available,
      problem: !available ? "unavailable" as const : v.stock <= 0 ? "out_of_stock" as const : i.quantity > v.stock ? "insufficient" as const : null,
    };
  });
  return { cartId, lines, count: lines.reduce((s, l) => s + l.quantity, 0) };
}

export async function cartCount(): Promise<number> {
  const id = await readCartId();
  if (!id) return 0;
  const [r] = await db.select({ n: sql<number>`coalesce(sum(${schema.cartItems.quantity}),0)::int` })
    .from(schema.cartItems).where(eq(schema.cartItems.cartId, id));
  return r?.n ?? 0;
}

export class CartError extends Error {}

export async function addItem(cartId: string, variantId: string, qty: number) {
  const v = await db.query.variants.findFirst({ where: eq(schema.variants.id, variantId), with: { product: true } });
  if (!v || !v.isActive || !v.product.isPublished) throw new CartError("This item is no longer available.");
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)),
  });
  const want = (existing?.quantity ?? 0) + qty;
  if (v.stock <= 0) throw new CartError("Sorry, this option is out of stock.");
  if (want > v.stock) throw new CartError(`Only ${v.stock} left in stock${existing ? " (some are already in your bag)" : ""}.`);
  if (want > MAX_QTY_PER_LINE) throw new CartError(`You can order up to ${MAX_QTY_PER_LINE} of each item.`);
  await db.insert(schema.cartItems).values({ cartId, variantId, quantity: want })
    .onConflictDoUpdate({ target: [schema.cartItems.cartId, schema.cartItems.variantId], set: { quantity: want } });
}

export async function setQuantity(cartId: string, itemId: string, qty: number) {
  const item = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)), with: { variant: true },
  });
  if (!item) throw new CartError("Item not found in your bag.");
  if (qty <= 0) { await db.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId)); return; }
  if (qty > MAX_QTY_PER_LINE) throw new CartError(`You can order up to ${MAX_QTY_PER_LINE} of each item.`);
  if (qty > item.variant.stock) throw new CartError(`Only ${item.variant.stock} left in stock.`);
  await db.update(schema.cartItems).set({ quantity: qty }).where(eq(schema.cartItems.id, itemId));
}
