import { and, eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { nextInvoiceNumber } from "../orders";
import { notifyOrder } from "../notifications";
import type { VerifiedPaymentEvent } from "./types";

export type ApplyResult =
  | { ok: true; outcome: "applied" | "duplicate" | "ignored"; orderId: string }
  | { ok: false; error: string };

/** Return reserved stock to inventory exactly once per order. */
export async function releaseStock(tx: Tx, orderId: string): Promise<boolean> {
  const [o] = await tx.update(schema.orders).set({ stockReleased: true })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.stockReleased, false)))
    .returning({ id: schema.orders.id });
  if (!o) return false;
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  for (const it of items) {
    if (!it.variantId) continue;
    await tx.update(schema.variants).set({ stock: sql`${schema.variants.stock} + ${it.quantity}` })
      .where(eq(schema.variants.id, it.variantId));
  }
  return true;
}

/**
 * Single entry point for every payment outcome (simulated buttons, live webhooks, admin refunds).
 * Idempotent: an event id is processed once; amount & currency must match the payment.
 */
export async function applyPaymentEvent(ev: VerifiedPaymentEvent, actor = "gateway"): Promise<ApplyResult> {
  let notify: { orderId: string; kind: "paid" | "cancelled" | "refunded" | "failed" } | null = null;
  const result = await db.transaction(async (tx): Promise<ApplyResult> => {
    const [payment] = await tx.select().from(schema.payments)
      .where(eq(schema.payments.providerRef, ev.providerRef)).for("update");
    if (!payment) return { ok: false, error: "Unknown payment reference" };

    const inserted = await tx.insert(schema.paymentEvents).values({
      paymentId: payment.id, providerEventId: ev.providerEventId, type: ev.type,
      amountMinor: ev.amountMinor, currency: ev.currency, payload: ev.payload,
    }).onConflictDoNothing({ target: schema.paymentEvents.providerEventId }).returning({ id: schema.paymentEvents.id });
    if (inserted.length === 0) return { ok: true, outcome: "duplicate", orderId: payment.orderId };

    if (ev.currency !== payment.currency || (ev.type !== "refunded" && ev.amountMinor !== payment.amountMinor)) {
      await tx.insert(schema.orderEvents).values({
        orderId: payment.orderId, actor,
        message: `Payment event rejected: amount/currency mismatch (${ev.currency} ${ev.amountMinor} vs ${payment.currency} ${payment.amountMinor})`,
      });
      return { ok: false, error: "Amount or currency mismatch" };
    }

    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, payment.orderId)).for("update");
    const log = (message: string) => tx.insert(schema.orderEvents).values({ orderId: order.id, message, actor });

    switch (ev.type) {
      case "succeeded": {
        if (payment.status === "PAID") return { ok: true, outcome: "ignored", orderId: order.id };
        await tx.update(schema.payments).set({ status: "PAID" }).where(eq(schema.payments.id, payment.id));
        if (order.paymentStatus === "PAID") {
          await log("Duplicate successful payment received on another attempt - refund required");
          return { ok: true, outcome: "applied", orderId: order.id };
        }
        const invoiceNumber = order.invoiceNumber ?? (await nextInvoiceNumber(tx));
        const lateAfterCancel = order.status === "CANCELLED";
        await tx.update(schema.orders).set({
          paymentStatus: "PAID",
          status: lateAfterCancel ? "CANCELLED" : "CONFIRMED",
          invoiceNumber, invoiceIssuedAt: order.invoiceIssuedAt ?? new Date(),
        }).where(eq(schema.orders.id, order.id));
        await log(lateAfterCancel
          ? "Payment received after the order was cancelled - review and refund"
          : `Payment confirmed (${payment.method}). Invoice ${invoiceNumber} issued.`);
        notify = { orderId: order.id, kind: "paid" };
        return { ok: true, outcome: "applied", orderId: order.id };
      }
      case "failed": {
        if (payment.status !== "PENDING") return { ok: true, outcome: "ignored", orderId: order.id };
        await tx.update(schema.payments).set({ status: "FAILED" }).where(eq(schema.payments.id, payment.id));
        if (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED") {
          await tx.update(schema.orders).set({ paymentStatus: "FAILED" }).where(eq(schema.orders.id, order.id));
        }
        await log("Payment declined. Items stay reserved for 60 minutes so the customer can retry.");
        notify = { orderId: order.id, kind: "failed" };
        return { ok: true, outcome: "applied", orderId: order.id };
      }
      case "cancelled": {
        if (payment.status !== "PENDING" && payment.status !== "FAILED") return { ok: true, outcome: "ignored", orderId: order.id };
        await tx.update(schema.payments).set({ status: "CANCELLED" }).where(eq(schema.payments.id, payment.id));
        if (order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED") {
          await tx.update(schema.orders).set({ paymentStatus: "CANCELLED", status: "CANCELLED" }).where(eq(schema.orders.id, order.id));
          await releaseStock(tx, order.id);
          await log("Payment cancelled by customer. Order cancelled and stock released.");
          notify = { orderId: order.id, kind: "cancelled" };
        }
        return { ok: true, outcome: "applied", orderId: order.id };
      }
      case "refunded": {
        if (payment.status !== "PAID") return { ok: false, error: "Only paid payments can be refunded" };
        const refunded = Math.min(payment.amountMinor, payment.refundedMinor + ev.amountMinor);
        const full = refunded >= payment.amountMinor;
        await tx.update(schema.payments).set({ refundedMinor: refunded, status: full ? "REFUNDED" : "PAID" })
          .where(eq(schema.payments.id, payment.id));
        if (full) await tx.update(schema.orders).set({ paymentStatus: "REFUNDED" }).where(eq(schema.orders.id, order.id));
        await log(`${full ? "Full" : "Partial"} refund of ${ev.currency} ${(ev.amountMinor / 10 ** order.currencyExponent).toFixed(order.currencyExponent)} recorded.`);
        notify = { orderId: order.id, kind: "refunded" };
        return { ok: true, outcome: "applied", orderId: order.id };
      }
    }
  });
  const n = notify as { orderId: string; kind: "paid" | "cancelled" | "refunded" | "failed" } | null;
  if (result.ok && n) await notifyOrder(n.orderId, n.kind).catch((e) => console.error("[notify]", e));
  return result;
}

/** Cancel unpaid orders older than `minutes` and return their stock. Safe to run repeatedly. */
export async function expireStaleOrders(minutes = 60): Promise<number> {
  const stale = await db.select({ id: schema.orders.id }).from(schema.orders).where(and(
    eq(schema.orders.status, "PENDING_PAYMENT"),
    sql`${schema.orders.paymentStatus} in ('PENDING','FAILED')`,
    sql`${schema.orders.createdAt} < now() - make_interval(mins => ${minutes})`,
  ));
  let n = 0;
  for (const { id } of stale) {
    const done = await db.transaction(async (tx) => {
      const [o] = await tx.update(schema.orders).set({ status: "CANCELLED", paymentStatus: "CANCELLED" })
        .where(and(eq(schema.orders.id, id), eq(schema.orders.status, "PENDING_PAYMENT"),
          sql`${schema.orders.paymentStatus} in ('PENDING','FAILED')`))
        .returning({ id: schema.orders.id });
      if (!o) return false;
      await tx.update(schema.payments).set({ status: "CANCELLED" })
        .where(and(eq(schema.payments.orderId, id), eq(schema.payments.status, "PENDING")));
      await releaseStock(tx, id);
      await tx.insert(schema.orderEvents).values({ orderId: id, message: `Payment not completed within ${minutes} minutes. Order cancelled and stock released.` });
      return true;
    });
    if (done) n++;
  }
  return n;
}
