import { sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { verifyOrderToken } from "./tokens";

export async function nextCounter(tx: Tx | typeof db, key: string): Promise<number> {
  const r = await tx.execute<{ value: number }>(sql`
    INSERT INTO counters (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = counters.value + 1 RETURNING value`);
  return Number(r.rows[0].value);
}

export async function nextOrderNumber(tx: Tx) {
  const yy = new Date().getUTCFullYear().toString().slice(2);
  const n = await nextCounter(tx, `order-${yy}`);
  return `21M-${yy}${n.toString().padStart(5, "0")}`;
}

export async function nextInvoiceNumber(tx: Tx) {
  const y = new Date().getUTCFullYear();
  const n = await nextCounter(tx, `invoice-${y}`);
  return `INV-${y}-${n.toString().padStart(6, "0")}`;
}

type Viewer = { id: string; role: string } | null;

/** Customer owns it, staff, or a valid signed guest link. */
export function canViewOrder(order: { id: string; userId: string | null }, viewer: Viewer, token?: string | null) {
  if (viewer && (viewer.role === "ADMIN" || viewer.role === "STAFF")) return true;
  if (viewer && order.userId && order.userId === viewer.id) return true;
  return verifyOrderToken(order.id, token);
}

export const invoiceEligible = (o: { paymentStatus: string }) =>
  o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", PROCESSING: "Processing",
  SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", PAID: "Paid", FAILED: "Failed", CANCELLED: "Cancelled", REFUNDED: "Refunded",
};
