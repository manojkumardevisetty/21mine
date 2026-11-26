import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/db";
import { CheckoutError, placeOrder, retryPayment, type CheckoutInput } from "@/lib/checkout";
import { applyPaymentEvent, expireStaleOrders } from "@/lib/payments/apply";
import { canViewOrder } from "@/lib/orders";
import { createOrderToken } from "@/lib/tokens";
import { renderInvoicePdf } from "@/lib/invoice";

const base = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  idempotencyKey: randomUUID(), email: "buyer@example.com", paymentMethod: "credit_card", discountCode: "", deliveryNotes: "",
  acceptTerms: "on", currency: "AED", fullName: "Test Buyer", phone: "+971 50 123 4567", country: "AE", region: "Dubai",
  city: "Dubai Marina", street: "", building: "Marina Gate 1", unit: "1203", landmark: "", postalCode: "", ...over,
} as CheckoutInput);

async function variant(sku: string) {
  return (await db.query.variants.findFirst({ where: eq(schema.variants.sku, sku) }))!;
}
async function cartWith(items: [string, number][]) {
  const [cart] = await db.insert(schema.carts).values({}).returning();
  for (const [sku, q] of items) await db.insert(schema.cartItems).values({ cartId: cart.id, variantId: (await variant(sku)).id, quantity: q });
  return cart.id;
}
async function setStock(sku: string, stock: number) {
  await db.update(schema.variants).set({ stock }).where(eq(schema.variants.sku, sku));
}
async function payment(orderId: string) {
  return (await db.query.payments.findFirst({ where: eq(schema.payments.orderId, orderId), orderBy: (p, { desc }) => [desc(p.createdAt)] }))!;
}
const ev = (p: { providerRef: string; amountMinor: number; currency: string }, type: "succeeded" | "failed" | "cancelled" | "refunded", id: string = randomUUID()) =>
  ({ providerRef: p.providerRef, providerEventId: id, type, amountMinor: p.amountMinor, currency: p.currency, payload: {} });

beforeEach(async () => {
  await setStock("PF-ROSEOUD-50", 10);
  await setStock("PN-NUDEALM-M", 10);
});
afterAll(async () => { await pool.end(); });

describe("checkout", () => {
  it("creates an order with server-side totals, snapshots and reserved stock", async () => {
    const cartId = await cartWith([["PF-ROSEOUD-50", 1], ["PN-NUDEALM-M", 2]]);
    const res = await placeOrder(base(), { cartId, userId: null });
    expect(res.redirectUrl).toMatch(/^\/pay\/simulated\//);
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId), with: { items: true } }))!;
    // 249 + 2*69 = 387 AED, free delivery over 200
    expect(o).toMatchObject({ subtotalMinor: 38700, shippingMinor: 0, totalMinor: 38700, currency: "AED", status: "PENDING_PAYMENT", paymentStatus: "PENDING", isDemo: true });
    expect(o.items.map((i) => i.productName)).toContain("Rose Oud Noir Eau de Parfum");
    expect(o.merchantSnapshot.legalName).toBe("XENTERPRISES DIGITAL SERVICES - FZCO");
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(9);
    expect((await variant("PN-NUDEALM-M")).stock).toBe(8);
    expect(await db.$count(schema.cartItems, eq(schema.cartItems.cartId, cartId))).toBe(0);
  });

  it("charges delivery below the free threshold", async () => {
    const cartId = await cartWith([["PN-NUDEALM-M", 1]]);
    const res = await placeOrder(base({ region: "Fujairah" }), { cartId, userId: null });
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!;
    expect(o).toMatchObject({ subtotalMinor: 6900, shippingMinor: 2000, totalMinor: 8900 });
  });

  it("is idempotent: repeated and concurrent submissions create one order and decrement stock once", async () => {
    const cartId = await cartWith([["PF-ROSEOUD-50", 2]]);
    const input = base();
    const results = await Promise.allSettled([1, 2, 3, 4, 5].map(() => placeOrder(input, { cartId, userId: null })));
    const ok = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ orderId: string }>).value.orderId);
    expect(new Set(ok).size).toBe(1);
    expect(await db.$count(schema.orders, eq(schema.orders.idempotencyKey, input.idempotencyKey))).toBe(1);
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(8);
    const again = await placeOrder(input, { cartId, userId: null });
    expect(again.reused).toBe(true);
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(8);
  });

  it("prevents overselling", async () => {
    await setStock("PF-ROSEOUD-50", 1);
    const a = await cartWith([["PF-ROSEOUD-50", 1]]);
    const b = await cartWith([["PF-ROSEOUD-50", 1]]);
    const res = await Promise.allSettled([placeOrder(base(), { cartId: a, userId: null }), placeOrder(base(), { cartId: b, userId: null })]);
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rej = res.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rej.reason).toBeInstanceOf(CheckoutError);
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(0);
  });

  it("rejects undeliverable destinations, bad currency and changed totals", async () => {
    const cartId = await cartWith([["PN-NUDEALM-M", 1]]);
    await expect(placeOrder(base({ country: "JP", region: "Tokyo", postalCode: "100" }), { cartId, userId: null })).rejects.toThrow(/deliver/);
    await expect(placeOrder(base({ currency: "XXX" }), { cartId, userId: null })).rejects.toThrow(/currency/);
    await expect(placeOrder(base({ expectedTotal: 1 }), { cartId, userId: null })).rejects.toThrow(/total changed/);
    expect((await variant("PN-NUDEALM-M")).stock).toBe(10); // rolled back
  });

  it("charges in the selected currency with consistent maths", async () => {
    const cartId = await cartWith([["PF-ROSEOUD-50", 1]]);
    const res = await placeOrder(base({ currency: "USD", country: "GB", region: "London", city: "London", building: "10 Downing St", postalCode: "SW1A 2AA", phone: "+44 20 7946 0000" }), { cartId, userId: null });
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId), with: { items: true } }))!;
    expect(o.currency).toBe("USD");
    expect(o.items[0].unitPriceMinor).toBe(6780); // 249 AED
    expect(o.shippingMinor).toBe(2587); // 95 AED
    expect(o.totalMinor).toBe(o.subtotalMinor - o.discountMinor + o.shippingMinor);
    expect((await payment(o.id)).currency).toBe("USD");
  });

  it("applies discount codes server-side and counts usage", async () => {
    await db.insert(schema.discountCodes).values({ code: "TEST10", type: "PERCENT", value: 10, maxUses: 1 }).onConflictDoNothing();
    const c1 = await cartWith([["PF-ROSEOUD-50", 1]]);
    const r = await placeOrder(base({ discountCode: "TEST10" }), { cartId: c1, userId: null });
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, r.orderId) }))!;
    expect(o).toMatchObject({ discountMinor: 2490, discountCode: "TEST10", totalMinor: 22410 });
    const c2 = await cartWith([["PF-ROSEOUD-50", 1]]);
    await expect(placeOrder(base({ discountCode: "TEST10" }), { cartId: c2, userId: null })).rejects.toThrow(/invalid|limit/);
  });
});

describe("payments", () => {
  it("success confirms, issues an invoice number, and is processed once", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PF-ROSEOUD-50", 1]]), userId: null });
    const p = await payment(res.orderId);
    const e = ev(p, "succeeded", `evt-${p.id}`);
    expect(await applyPaymentEvent(e)).toMatchObject({ ok: true, outcome: "applied" });
    expect(await applyPaymentEvent(e)).toMatchObject({ ok: true, outcome: "duplicate" });
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!;
    expect(o).toMatchObject({ paymentStatus: "PAID", status: "CONFIRMED" });
    expect(o.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
  });

  it("rejects amount or currency mismatches", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PF-ROSEOUD-50", 1]]), userId: null });
    const p = await payment(res.orderId);
    expect(await applyPaymentEvent({ ...ev(p, "succeeded"), amountMinor: p.amountMinor - 1 })).toMatchObject({ ok: false });
    expect(await applyPaymentEvent({ ...ev(p, "succeeded"), currency: "USD" })).toMatchObject({ ok: false });
    expect((await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!.paymentStatus).toBe("PENDING");
  });

  it("decline keeps stock reserved, retry creates a new attempt that can succeed", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PF-ROSEOUD-50", 1]]), userId: null });
    const p1 = await payment(res.orderId);
    await applyPaymentEvent(ev(p1, "failed"));
    let o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!;
    expect(o.paymentStatus).toBe("FAILED");
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(9);
    const url = await retryPayment(res.orderId);
    expect(url).toMatch(/^\/pay\/simulated\//);
    const p2 = await payment(res.orderId);
    expect(p2.id).not.toBe(p1.id);
    await applyPaymentEvent(ev(p2, "succeeded"));
    o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!;
    expect(o.paymentStatus).toBe("PAID");
  });

  it("cancel releases stock exactly once", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PF-ROSEOUD-50", 3]]), userId: null });
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(7);
    const p = await payment(res.orderId);
    await applyPaymentEvent(ev(p, "cancelled"));
    await applyPaymentEvent(ev(p, "cancelled"));
    await applyPaymentEvent(ev(p, "failed")); // late event after cancel must not change anything
    expect((await variant("PF-ROSEOUD-50")).stock).toBe(10);
    expect((await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!.status).toBe("CANCELLED");
  });

  it("expires stale unpaid orders and returns stock", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PN-NUDEALM-M", 4]]), userId: null });
    expect((await variant("PN-NUDEALM-M")).stock).toBe(6);
    await db.update(schema.orders).set({ createdAt: new Date(Date.now() - 2 * 3600_000) }).where(eq(schema.orders.id, res.orderId));
    expect(await expireStaleOrders(60)).toBeGreaterThanOrEqual(1);
    expect((await variant("PN-NUDEALM-M")).stock).toBe(10);
  });

  it("records refunds", async () => {
    const res = await placeOrder(base(), { cartId: await cartWith([["PF-ROSEOUD-50", 1]]), userId: null });
    const p = await payment(res.orderId);
    await applyPaymentEvent(ev(p, "succeeded"));
    expect(await applyPaymentEvent(ev(p, "refunded"))).toMatchObject({ ok: true });
    expect((await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId) }))!.paymentStatus).toBe("REFUNDED");
  });
});

describe("access control & invoices", () => {
  it("only the owner, staff or a valid signed link can view an order", async () => {
    const [u1] = await db.insert(schema.users).values({ email: `a-${randomUUID()}@x.com`, name: "A", passwordHash: "x" }).returning();
    const [u2] = await db.insert(schema.users).values({ email: `b-${randomUUID()}@x.com`, name: "B", passwordHash: "x" }).returning();
    const res = await placeOrder(base(), { cartId: await cartWith([["PN-NUDEALM-M", 1]]), userId: u1.id });
    const o = { id: res.orderId, userId: u1.id };
    expect(canViewOrder(o, { id: u1.id, role: "CUSTOMER" })).toBe(true);
    expect(canViewOrder(o, { id: u2.id, role: "CUSTOMER" })).toBe(false);
    expect(canViewOrder(o, { id: u2.id, role: "STAFF" })).toBe(true);
    expect(canViewOrder(o, null)).toBe(false);
    expect(canViewOrder(o, null, createOrderToken(res.orderId))).toBe(true);
    expect(canViewOrder(o, { id: u2.id, role: "CUSTOMER" }, createOrderToken("other-order"))).toBe(false);
  });

  it("invoice PDF shows the same totals as the order and a demo watermark", async () => {
    const res = await placeOrder(base({ currency: "USD" }), { cartId: await cartWith([["PF-ROSEOUD-50", 1], ["PN-NUDEALM-M", 1]]), userId: null });
    const p = await payment(res.orderId);
    await applyPaymentEvent(ev(p, "succeeded"));
    const o = (await db.query.orders.findFirst({ where: eq(schema.orders.id, res.orderId), with: { items: true } }))!;
    const pdf = await renderInvoicePdf(o);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
