import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { COUNTRIES, UAE_EMIRATES } from "./countries";
import { computeQuote, type PricingDiscount, type Quote } from "./pricing";
import { findZone, getSettings, merchantSnapshot, type Settings } from "./settings";
import { resolveCurrency } from "./currency";
import { nextOrderNumber } from "./orders";
import { getProvider } from "./payments";
import type { PaymentMethodId } from "./payments/types";
import { env, isDemo } from "./env";
import { createOrderToken, randomToken } from "./tokens";
import { toBaseFils } from "./money";

const phoneRe = /^\+?[0-9 ()-]{7,20}$/;

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's full name").max(100),
  phone: z.string().trim().regex(phoneRe, "Enter a valid phone number with country code"),
  country: z.string().trim().length(2, "Choose a country"),
  region: z.string().trim().min(2, "Choose an emirate / enter a state or region").max(80),
  city: z.string().trim().min(2, "Enter the area or city").max(80),
  street: z.string().trim().max(120).optional().or(z.literal("")),
  building: z.string().trim().min(2, "Enter the building / villa or address line").max(120),
  unit: z.string().trim().max(60).optional().or(z.literal("")),
  landmark: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
}).superRefine((a, ctx) => {
  const c = COUNTRIES.find((x) => x.code === a.country);
  if (!c) ctx.addIssue({ code: "custom", path: ["country"], message: "We don't ship to this country yet" });
  if (a.country === "AE" && !(UAE_EMIRATES as readonly string[]).includes(a.region))
    ctx.addIssue({ code: "custom", path: ["region"], message: "Choose an emirate" });
  if (a.country === "AE") {
    const digits = a.phone.replace(/\D/g, "");
    if (!/^(971|0)?5\d{8}$/.test(digits) && !/^(971|0)?[2-9]\d{7}$/.test(digits))
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a UAE number, e.g. +971 50 123 4567" });
  }
  if (c?.postal && !a.postalCode)
    ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Postal code is required for this country" });
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  paymentMethod: z.enum(["credit_card", "debit_card", "apple_pay", "google_pay"], { message: "Choose a payment method" }),
  discountCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
  deliveryNotes: z.string().trim().max(300).optional().or(z.literal("")),
  acceptTerms: z.literal("on", { message: "Please accept the Terms of Sale to continue" }),
  currency: z.string().length(3),
  saveAddress: z.string().optional(),
  expectedTotal: z.coerce.number().int().optional(),
}).and(addressSchema);

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {
  constructor(message: string, public field?: string) { super(message); }
}

async function loadDiscount(code: string | undefined | null): Promise<PricingDiscount | null | "invalid"> {
  if (!code) return null;
  const d = await db.query.discountCodes.findFirst({
    where: and(
      eq(schema.discountCodes.code, code.toUpperCase()), eq(schema.discountCodes.isActive, true),
      or(isNull(schema.discountCodes.expiresAt), gt(schema.discountCodes.expiresAt, new Date())),
      or(isNull(schema.discountCodes.maxUses), lt(schema.discountCodes.usedCount, schema.discountCodes.maxUses)),
    ),
  });
  if (!d) return "invalid";
  return { code: d.code, type: d.type, value: d.value, minSubtotalFils: d.minSubtotalFils };
}

export function taxContext(s: Settings, country: string | null) {
  return { enabled: s.taxEnabled, rateBps: s.taxRateBps, inclusive: s.pricesIncludeTax, applies: !!country && s.taxCountries.includes(country) };
}

/** Quote for display (cart / checkout review). Server-side, from live catalogue prices. */
export async function quoteCart(opts: {
  lines: { variantId: string; unitPriceFils: number; quantity: number }[];
  currencyCode: string; country?: string | null; region?: string | null; discountCode?: string | null;
}): Promise<Quote & { discountInvalid: boolean }> {
  const s = await getSettings();
  const currency = await resolveCurrency(opts.currencyCode);
  const zone = opts.country ? findZone(s.deliveryZones, opts.country, opts.region) : null;
  const d = await loadDiscount(opts.discountCode);
  const q = computeQuote({
    lines: opts.lines, currency, zone, discount: d === "invalid" ? null : d,
    tax: taxContext(s, opts.country ?? null),
  });
  return { ...q, discountInvalid: d === "invalid" };
}

export type PlacedOrder = { orderId: string; number: string; redirectUrl: string; reused: boolean };

/**
 * Creates the order atomically: validates stock, reserves inventory, snapshots prices/products,
 * and starts a payment. The idempotency key makes repeated submissions return the same order.
 */
export async function placeOrder(input: CheckoutInput, ctx: { cartId: string; userId: string | null }): Promise<PlacedOrder> {
  const existing = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
  if (existing) return reuse(existing.id, ctx.userId);

  const settings = await getSettings();
  const currency = await resolveCurrency(input.currency);
  if (currency.code !== input.currency) throw new CheckoutError("The selected currency is no longer available. Please review your total.");
  const provider = getProvider();
  if (provider.supportedCurrencies !== "all" && provider.supportedCurrencies && provider.supportedCurrencies.length && !provider.supportedCurrencies.includes(currency.code))
    throw new CheckoutError(`Payments in ${currency.code} are not available. Please switch to AED.`);
  const method = input.paymentMethod as PaymentMethodId;
  if (!provider.methods({ currency: currency.code }).some((m) => m.id === method) && !provider.simulated)
    throw new CheckoutError("This payment method is not available.", "paymentMethod");

  const zone = findZone(settings.deliveryZones, input.country, input.region);
  if (!zone) throw new CheckoutError("Sorry, we don't deliver to this address yet.", "country");

  const discount = await loadDiscount(input.discountCode || null);
  if (discount === "invalid") throw new CheckoutError("This discount code is invalid or has expired.", "discountCode");

  let created: { orderId: string; number: string; paymentId: string; total: number } | null = null;
  try {
    created = await db.transaction(async (tx) => {
      const items = await tx.query.cartItems.findMany({
        where: eq(schema.cartItems.cartId, ctx.cartId),
        with: { variant: { with: { product: { with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 } } } } } },
      });
      if (items.length === 0) throw new CheckoutError("Your bag is empty.");

      // Reserve stock with conditional decrements (no overselling under concurrency)
      for (const it of items) {
        const v = it.variant;
        if (!v.isActive || !v.product.isPublished) throw new CheckoutError(`${v.product.name} (${v.name}) is no longer available. Please remove it from your bag.`);
        const r = await tx.update(schema.variants).set({ stock: sql`${schema.variants.stock} - ${it.quantity}` })
          .where(and(eq(schema.variants.id, v.id), sql`${schema.variants.stock} >= ${it.quantity}`))
          .returning({ id: schema.variants.id });
        if (r.length === 0) throw new CheckoutError(`Only ${v.stock} of ${v.product.name} (${v.name}) left. Please update your bag.`);
      }

      if (discount) {
        const r = await tx.update(schema.discountCodes).set({ usedCount: sql`${schema.discountCodes.usedCount} + 1` })
          .where(and(eq(schema.discountCodes.code, discount.code),
            or(isNull(schema.discountCodes.maxUses), lt(schema.discountCodes.usedCount, schema.discountCodes.maxUses))))
          .returning({ id: schema.discountCodes.id });
        if (r.length === 0) throw new CheckoutError("This discount code has reached its usage limit.", "discountCode");
      }

      const q = computeQuote({
        lines: items.map((i) => ({ variantId: i.variantId, unitPriceFils: i.variant.priceFils, quantity: i.quantity })),
        currency, zone, discount, tax: taxContext(settings, input.country),
      });
      if (q.discountError === "minimum") throw new CheckoutError("Your bag doesn't meet this code's minimum spend.", "discountCode");
      if (input.expectedTotal !== undefined && input.expectedTotal !== q.totalMinor)
        throw new CheckoutError("Your total changed (prices, stock or delivery were updated). Please review the new total and place your order again.", "total");

      const number = await nextOrderNumber(tx);
      const [order] = await tx.insert(schema.orders).values({
        number, userId: ctx.userId, idempotencyKey: input.idempotencyKey, email: input.email,
        paymentProvider: provider.id, paymentMethod: method,
        currency: currency.code, currencyExponent: currency.exponent, fxRateMicros: currency.rateMicros,
        subtotalMinor: q.subtotalMinor, discountMinor: q.discountMinor, discountCode: q.discountCode,
        shippingMinor: q.shippingMinor, taxMinor: q.taxMinor, taxRateBps: q.taxRateBps, totalMinor: q.totalMinor,
        totalBaseFils: toBaseFils(q.totalMinor, currency),
        shipName: input.fullName, shipPhone: input.phone, shipCountry: input.country, shipRegion: input.region,
        shipCity: input.city, shipStreet: input.street || null, shipBuilding: input.building,
        shipUnit: input.unit || null, shipLandmark: input.landmark || null, shipPostalCode: input.postalCode || null,
        deliveryNotes: input.deliveryNotes || null,
        merchantSnapshot: merchantSnapshot(settings), isDemo: isDemo() || provider.simulated,
        termsAcceptedAt: new Date(),
      }).returning();

      await tx.insert(schema.orderItems).values(items.map((it, idx) => ({
        orderId: order.id, variantId: it.variantId,
        productName: it.variant.product.name, variantName: it.variant.name, sku: it.variant.sku,
        productSlug: it.variant.product.slug, image: it.variant.product.images[0]?.url ?? null,
        details: { ...it.variant.options },
        unitPriceMinor: q.lines[idx].unitMinor, quantity: it.quantity, lineTotalMinor: q.lines[idx].lineMinor,
      })));

      const [payment] = await tx.insert(schema.payments).values({
        orderId: order.id, provider: provider.id, method, providerRef: `pending_${randomToken(12)}`,
        amountMinor: q.totalMinor, currency: currency.code,
      }).returning();

      await tx.insert(schema.orderEvents).values({ orderId: order.id, message: `Order placed (${currency.code}). Awaiting payment via ${provider.label}.`, actor: ctx.userId ? "customer" : "guest" });

      if (input.saveAddress === "on" && ctx.userId) {
        const count = await tx.$count(schema.addresses, eq(schema.addresses.userId, ctx.userId));
        await tx.insert(schema.addresses).values({
          userId: ctx.userId, label: "Delivery", fullName: input.fullName, phone: input.phone, country: input.country,
          region: input.region, city: input.city, street: input.street || null, building: input.building,
          unit: input.unit || null, landmark: input.landmark || null, postalCode: input.postalCode || null,
          isDefault: count === 0,
        });
      }

      await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, ctx.cartId));
      return { orderId: order.id, number, paymentId: payment.id, total: q.totalMinor };
    });
  } catch (e) {
    // Concurrent duplicate submission: unique idempotency key violation -> return the winner
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505") {
      const again = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
      if (again) return reuse(again.id, ctx.userId);
    }
    const cause = (e as { cause?: { code?: string } })?.cause;
    if (cause?.code === "23505") {
      const again = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, input.idempotencyKey) });
      if (again) return reuse(again.id, ctx.userId);
    }
    throw e;
  }

  const redirectUrl = await startPayment(created.paymentId);
  return { orderId: created.orderId, number: created.number, redirectUrl, reused: false };
}

async function reuse(orderId: string, userId: string | null): Promise<PlacedOrder> {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { payments: true } });
  if (!o) throw new CheckoutError("Order not found");
  if (o.userId && o.userId !== userId) throw new CheckoutError("This checkout session belongs to another account.");
  const pending = o.payments.find((p) => p.status === "PENDING");
  const redirectUrl = o.paymentStatus === "PENDING" && pending ? await startPayment(pending.id) : `/orders/${o.number}`;
  return { orderId: o.id, number: o.number, redirectUrl, reused: true };
}

/** Creates (or re-uses) the provider session for a payment row and returns the redirect URL. */
export async function startPayment(paymentId: string): Promise<string> {
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId), with: { order: true } });
  if (!p) throw new CheckoutError("Payment not found");
  const provider = getProvider(p.provider);
  if (provider.simulated) {
    if (p.providerRef.startsWith("pending_")) {
      const { providerRef } = await provider.createPayment({
        paymentId: p.id, orderId: p.orderId, orderNumber: p.order.number, amountMinor: p.amountMinor,
        currency: p.currency, method: p.method as PaymentMethodId, customerEmail: p.order.email,
        returnUrl: "", cancelUrl: "",
      });
      await db.update(schema.payments).set({ providerRef }).where(eq(schema.payments.id, p.id));
    }
    return `/pay/simulated/${p.id}?t=${createOrderToken(p.orderId, 1)}`;
  }
  const tok = createOrderToken(p.orderId, 1);
  const { providerRef, redirectUrl } = await provider.createPayment({
    paymentId: p.id, orderId: p.orderId, orderNumber: p.order.number, amountMinor: p.amountMinor,
    currency: p.currency, method: p.method as PaymentMethodId, customerEmail: p.order.email,
    returnUrl: `${env.appUrl}/pay/return/${p.id}?t=${tok}`, cancelUrl: `${env.appUrl}/pay/return/${p.id}?t=${tok}&cancelled=1`,
  });
  await db.update(schema.payments).set({ providerRef }).where(eq(schema.payments.id, p.id));
  return redirectUrl;
}

/** New payment attempt after a decline (same amount/currency). */
export async function retryPayment(orderId: string): Promise<string> {
  const id = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!o || o.status !== "PENDING_PAYMENT" || !["FAILED", "PENDING"].includes(o.paymentStatus))
      throw new CheckoutError("This order can no longer be paid. Please place a new order.");
    const pending = await tx.query.payments.findFirst({
      where: and(eq(schema.payments.orderId, o.id), eq(schema.payments.status, "PENDING")),
    });
    if (pending) return pending.id;
    const [p] = await tx.insert(schema.payments).values({
      orderId: o.id, provider: o.paymentProvider, method: o.paymentMethod, providerRef: `pending_${randomToken(12)}`,
      amountMinor: o.totalMinor, currency: o.currency,
    }).returning();
    await tx.update(schema.orders).set({ paymentStatus: "PENDING" }).where(eq(schema.orders.id, o.id));
    await tx.insert(schema.orderEvents).values({ orderId: o.id, message: "Customer retried payment." });
    return p.id;
  });
  return startPayment(id);
}
