import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function ordersForUser(userId: string, limit = 100) {
  return db.select({
    id: schema.orders.id, number: schema.orders.number, createdAt: schema.orders.createdAt, totalMinor: schema.orders.totalMinor,
    currency: schema.orders.currency, currencyExponent: schema.orders.currencyExponent, status: schema.orders.status,
    paymentStatus: schema.orders.paymentStatus,
    itemCount: sql<number>`(select coalesce(sum(quantity),0) from order_items where order_id = ${schema.orders.id})::int`,
  }).from(schema.orders).where(eq(schema.orders.userId, userId)).orderBy(desc(schema.orders.createdAt)).limit(limit);
}
