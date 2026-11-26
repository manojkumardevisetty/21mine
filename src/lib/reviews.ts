import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

/** Returns the paid order id proving the user bought this product, or null. */
export async function verifiedPurchase(userId: string, productId: string): Promise<string | null> {
  const variantIds = (await db.select({ id: schema.variants.id }).from(schema.variants).where(eq(schema.variants.productId, productId))).map((v) => v.id);
  if (!variantIds.length) return null;
  const [row] = await db.select({ orderId: schema.orders.id }).from(schema.orders)
    .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.paymentStatus, "PAID"), inArray(schema.orderItems.variantId, variantIds)))
    .limit(1);
  return row?.orderId ?? null;
}

export async function userReview(userId: string, productId: string) {
  return db.query.reviews.findFirst({ where: and(eq(schema.reviews.userId, userId), eq(schema.reviews.productId, productId)) });
}
