"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/authz";
import { canViewOrder } from "@/lib/orders";
import { applyPaymentEvent } from "@/lib/payments/apply";
import { getProviderById } from "@/lib/payments";
import { CheckoutError, retryPayment } from "@/lib/checkout";
import { createOrderToken } from "@/lib/tokens";

export async function simulatePaymentAction(fd: FormData) {
  const paymentId = String(fd.get("paymentId") ?? "");
  const outcome = String(fd.get("outcome") ?? "");
  const token = String(fd.get("t") ?? "");
  if (!["succeeded", "failed", "cancelled"].includes(outcome)) throw new Error("Invalid outcome");
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId), with: { order: true } });
  if (!p) redirect("/");
  if (!canViewOrder(p.order, await getUser(), token)) redirect("/");
  const provider = getProviderById(p.provider);
  if (!provider?.simulated) throw new Error("Not a simulated payment");
  // Deterministic event id => double clicks / refreshes are processed once.
  await applyPaymentEvent({
    providerRef: p.providerRef, providerEventId: `${p.providerRef}:${outcome}`,
    type: outcome as "succeeded" | "failed" | "cancelled", amountMinor: p.amountMinor, currency: p.currency,
    payload: { simulated: true, outcome },
  }, "customer");
  redirect(`/orders/${p.order.number}?t=${createOrderToken(p.orderId)}&from=payment`);
}

export async function retryPaymentAction(fd: FormData) {
  const orderId = String(fd.get("orderId") ?? "");
  const token = String(fd.get("t") ?? "");
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!o || !canViewOrder(o, await getUser(), token)) redirect("/");
  let url: string;
  try { url = await retryPayment(orderId); }
  catch (e) {
    if (e instanceof CheckoutError) redirect(`/orders/${o.number}?t=${createOrderToken(o.id)}&error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(url);
}
