"use server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { invalidateSettings } from "@/lib/settings";
import { applyPaymentEvent, releaseStock } from "@/lib/payments/apply";
import { getProviderById } from "@/lib/payments";
import { notifyOrder } from "@/lib/notifications";
import { parseMajor } from "@/lib/money";
import type { DeliveryZone } from "@/db/schema";

export type AdminState = { ok: boolean; message: string; errors?: Record<string, string> } | null;
const fieldErrors = (issues: z.core.$ZodIssue[]) => {
  const e: Record<string, string> = {};
  for (const i of issues) e[String(i.path.join("."))] ??= i.message;
  return e;
};
const actorOf = (u: { id: string; email: string }) => ({ id: u.id, email: u.email });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

// ======================= ORDERS =======================
const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: [], CONFIRMED: ["PROCESSING", "SHIPPED"], PROCESSING: ["SHIPPED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [],
};

export async function updateOrderStatusAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId"), to = str(fd, "status"), tracking = str(fd, "trackingNumber");
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
    if (!o) return { ok: false, message: "Order not found." };
    if (!NEXT_STATUS[o.status]?.includes(to)) return { ok: false, message: `Can't change status from ${o.status} to ${to}.` };
    if (o.paymentStatus !== "PAID") return { ok: false, message: "Only paid orders can be fulfilled." };
    if (to === "SHIPPED" && !tracking && !o.trackingNumber) return { ok: false, message: "Add a tracking number (or courier reference) before marking as shipped.", errors: { trackingNumber: "Required for shipping" } };
    await tx.update(schema.orders).set({ status: to as typeof o.status, trackingNumber: tracking || o.trackingNumber }).where(eq(schema.orders.id, id));
    await tx.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: `Status changed to ${to}${tracking ? ` (tracking ${tracking})` : ""}.` });
    await audit(actorOf(u), "order.status", "order", id, { from: o.status, to, tracking: tracking || undefined }, tx);
    return { ok: true, message: `Order marked as ${to.toLowerCase()}.` };
  });
  if (res.ok && (to === "SHIPPED" || to === "DELIVERED")) await notifyOrder(id, to === "SHIPPED" ? "shipped" : "delivered").catch(console.error);
  revalidatePath(`/admin/orders/${id}`);
  return res;
}

export async function saveTrackingAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId"), tracking = str(fd, "trackingNumber").slice(0, 80);
  await db.update(schema.orders).set({ trackingNumber: tracking || null }).where(eq(schema.orders.id, id));
  await db.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: tracking ? `Tracking number set to ${tracking}.` : "Tracking number removed." });
  await audit(actorOf(u), "order.tracking", "order", id, { tracking });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Tracking saved." };
}

export async function addOrderNoteAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId"), note = str(fd, "note").slice(0, 500);
  if (!note) return { ok: false, message: "Write a note first." };
  await db.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: `Note: ${note}` });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Note added." };
}

/** Full refund through the payment provider; optional restock; optional cancel. */
export async function refundOrderAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  const restock = fd.get("restock") === "on";
  const cancel = fd.get("cancel") === "on";
  const reason = str(fd, "reason");
  if (fd.get("confirm") !== "REFUND") return { ok: false, message: 'Type REFUND to confirm.', errors: { confirm: 'Type REFUND to confirm' } };
  if (!reason) return { ok: false, message: "Enter a reason for the refund.", errors: { reason: "Required" } };
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, id), with: { payments: true } });
  if (!o) return { ok: false, message: "Order not found." };
  const paid = o.payments.find((p) => p.status === "PAID");
  if (!paid || o.paymentStatus !== "PAID") return { ok: false, message: "This order has no completed payment to refund." };
  const provider = getProviderById(paid.provider);
  if (!provider?.refund) return { ok: false, message: "This payment provider doesn't support refunds from the admin panel. Refund in the gateway dashboard; the webhook will update the order." };
  const amount = paid.amountMinor - paid.refundedMinor;
  let eventId: string;
  try { ({ providerEventId: eventId } = await provider.refund({ providerRef: paid.providerRef, amountMinor: amount, currency: paid.currency })); }
  catch (e) { console.error(e); return { ok: false, message: "The payment provider rejected the refund. No changes were made." }; }
  const r = await applyPaymentEvent({ providerRef: paid.providerRef, providerEventId: eventId, type: "refunded", amountMinor: amount, currency: paid.currency, payload: { reason, by: u.email } }, u.email);
  if (!r.ok) return { ok: false, message: r.error };
  await db.transaction(async (tx) => {
    if (cancel) {
      await tx.update(schema.orders).set({ status: "CANCELLED" }).where(eq(schema.orders.id, id));
      await tx.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: "Order cancelled." });
    }
    if (restock && (await releaseStock(tx, id))) await tx.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: "Items returned to stock." });
    await tx.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: `Refund reason: ${reason}` });
    await audit(actorOf(u), "order.refund", "order", id, { amountMinor: amount, currency: paid.currency, restock, cancel, reason }, tx);
  });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Refund recorded and customer notified." };
}

/** Cancel an unpaid order (releases stock). Paid orders must be refunded instead. */
export async function cancelUnpaidOrderAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
    if (!o) return { ok: false, message: "Order not found." };
    if (o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED") return { ok: false, message: "Paid orders must be refunded (tick 'cancel order' in the refund form)." };
    if (o.status === "CANCELLED") return { ok: false, message: "Order already cancelled." };
    await tx.update(schema.orders).set({ status: "CANCELLED", paymentStatus: "CANCELLED" }).where(eq(schema.orders.id, id));
    await tx.update(schema.payments).set({ status: "CANCELLED" }).where(and(eq(schema.payments.orderId, id), eq(schema.payments.status, "PENDING")));
    await releaseStock(tx, id);
    await tx.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: "Cancelled by staff. Stock released." });
    await audit(actorOf(u), "order.cancel", "order", id, {}, tx);
    return { ok: true, message: "Order cancelled and stock released." };
  });
  if (res.ok) await notifyOrder(id, "cancelled").catch(console.error);
  revalidatePath(`/admin/orders/${id}`);
  return res;
}

export async function resendConfirmationAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!o || o.paymentStatus !== "PAID") return { ok: false, message: "Only paid orders have a confirmation email." };
  await notifyOrder(id, "paid");
  await db.insert(schema.orderEvents).values({ orderId: id, actor: u.email, message: "Confirmation email re-sent." });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Confirmation email sent." };
}

// ======================= PRODUCTS =======================
const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  nameAr: z.string().trim().max(120).optional(),
  slug: z.string().trim().max(90).regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens").optional(),
  kind: z.enum(["PERFUME", "PRESS_ON_NAILS", "NAIL_ACCESSORY", "FASHION_ACCESSORY"]),
  categoryId: z.string().min(1, "Choose a category"),
  shortDescription: z.string().trim().min(5, "Add a short description").max(200),
  description: z.string().trim().min(20, "Add a full description (20+ characters)").max(5000),
  details: z.string().max(4000).optional(),
  highlights: z.string().max(1000).optional(),
  careInfo: z.string().max(2000).optional(),
});

function parseDetails(src: string | undefined): Record<string, string> | string {
  const out: Record<string, string> = {};
  for (const [n, line] of (src ?? "").split("\n").entries()) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 1) return `Line ${n + 1}: use the format "Label: value"`;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

export async function saveProductAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "id");
  const parsed = productSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const details = parseDetails(d.details);
  if (typeof details === "string") return { ok: false, message: details, errors: { details } };
  const slug = d.slug || slugify(d.name);
  const clash = await db.query.products.findFirst({ where: eq(schema.products.slug, slug), columns: { id: true } });
  if (clash && clash.id !== id) return { ok: false, message: "Another product already uses this URL slug.", errors: { slug: "Slug already in use" } };
  const values = {
    name: d.name, nameAr: d.nameAr || null, slug, kind: d.kind, categoryId: d.categoryId, shortDescription: d.shortDescription,
    description: d.description, details, highlights: (d.highlights ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8),
    careInfo: d.careInfo?.trim() || null, isPublished: fd.get("isPublished") === "on", isFeatured: fd.get("isFeatured") === "on",
  };
  let pid = id;
  if (id) {
    await db.update(schema.products).set(values).where(eq(schema.products.id, id));
    await audit(actorOf(u), "product.update", "product", id, { name: d.name, published: values.isPublished });
  } else {
    const [row] = await db.insert(schema.products).values({ ...values, isPublished: false }).returning({ id: schema.products.id });
    pid = row.id;
    await audit(actorOf(u), "product.create", "product", pid, { name: d.name });
  }
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/products/${pid}?created=1`);
  return { ok: true, message: "Product saved." };
}

const variantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(2, "SKU required").max(40).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, - _ . only"),
  name: z.string().trim().min(1, "Name required").max(60),
  optionName: z.string().trim().max(30).optional(),
  price: z.string().trim(),
  compareAt: z.string().trim().optional(),
  stock: z.coerce.number().int("Whole number").min(0, "Can't be negative").max(100000),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export async function saveVariantAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const id = str(fd, "id");
  const parsed = variantSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the variant fields.", errors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const priceFils = parseMajor(d.price, 2);
  if (priceFils === null || priceFils <= 0) return { ok: false, message: "Enter a valid AED price, e.g. 149 or 149.50", errors: { price: "Invalid price" } };
  const compareAtFils = d.compareAt ? parseMajor(d.compareAt, 2) : null;
  if (d.compareAt && (compareAtFils === null || compareAtFils <= priceFils)) return { ok: false, message: "Compare-at price must be higher than the price.", errors: { compareAt: "Must be higher than price" } };
  const dup = await db.query.variants.findFirst({ where: eq(schema.variants.sku, d.sku.toUpperCase()), columns: { id: true } });
  if (dup && dup.id !== id) return { ok: false, message: "This SKU is already used.", errors: { sku: "SKU already exists" } };
  const values = {
    sku: d.sku.toUpperCase(), name: d.name, options: { [d.optionName || "Option"]: d.name }, priceFils, compareAtFils,
    stock: d.stock, isActive: fd.get("isActive") === "on", sortOrder: d.sortOrder ?? 0,
  };
  if (id) {
    const before = await db.query.variants.findFirst({ where: eq(schema.variants.id, id) });
    if (!before || before.productId !== d.productId) return { ok: false, message: "Variant not found." };
    await db.update(schema.variants).set(values).where(eq(schema.variants.id, id));
    await audit(actorOf(u), "variant.update", "variant", id, {
      sku: values.sku, price: before.priceFils !== priceFils ? { from: before.priceFils, to: priceFils } : undefined,
      stock: before.stock !== d.stock ? { from: before.stock, to: d.stock } : undefined,
    });
  } else {
    const [row] = await db.insert(schema.variants).values({ ...values, productId: d.productId }).returning({ id: schema.variants.id });
    await audit(actorOf(u), "variant.create", "variant", row.id, { sku: values.sku, priceFils, stock: d.stock });
  }
  revalidatePath(`/admin/products/${d.productId}`);
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Variant updated." : "Variant added." };
}

export async function deleteVariantAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "id"), productId = str(fd, "productId");
  const used = await db.$count(schema.orderItems, eq(schema.orderItems.variantId, id));
  if (used > 0) {
    await db.update(schema.variants).set({ isActive: false }).where(eq(schema.variants.id, id));
    await audit(actorOf(u), "variant.deactivate", "variant", id, { reason: "has orders" });
  } else {
    await db.delete(schema.variants).where(eq(schema.variants.id, id));
    await audit(actorOf(u), "variant.delete", "variant", id, {});
  }
  revalidatePath(`/admin/products/${productId}`);
}

export async function addImageAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const productId = str(fd, "productId");
  const url = str(fd, "url");
  const alt = str(fd, "alt").slice(0, 160);
  if (!/^(\/[\w\-./]+|https:\/\/[^\s"'<>]+)$/.test(url)) return { ok: false, message: "Upload a file or enter an https:// image URL.", errors: { url: "Invalid URL" } };
  if (!alt) return { ok: false, message: "Describe the image (alt text) for accessibility.", errors: { alt: "Required" } };
  const max = await db.select({ m: sql<number>`coalesce(max(${schema.productImages.sortOrder}), -1)::int` }).from(schema.productImages).where(eq(schema.productImages.productId, productId));
  await db.insert(schema.productImages).values({ productId, url, alt, sortOrder: (max[0]?.m ?? -1) + 1 });
  await audit(actorOf(u), "image.add", "product", productId, { url });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Image added." };
}

export async function imageCommandAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "id"), productId = str(fd, "productId"), cmd = str(fd, "cmd");
  const imgs = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, productId)).orderBy(schema.productImages.sortOrder);
  const idx = imgs.findIndex((i) => i.id === id);
  if (idx < 0) return;
  if (cmd === "delete") {
    await db.delete(schema.productImages).where(eq(schema.productImages.id, id));
    await audit(actorOf(u), "image.delete", "product", productId, { url: imgs[idx].url });
  } else {
    const swap = cmd === "up" ? idx - 1 : cmd === "first" ? 0 : idx + 1;
    if (swap < 0 || swap >= imgs.length) return;
    const order = [...imgs];
    const [moved] = order.splice(idx, 1);
    order.splice(swap, 0, moved);
    await db.transaction(async (tx) => {
      for (const [i, im] of order.entries()) await tx.update(schema.productImages).set({ sortOrder: i }).where(eq(schema.productImages.id, im.id));
    });
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
}

// ======================= CATEGORIES =======================
export async function saveCategoryAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const s = z.object({
    name: z.string().trim().min(2, "Name required").max(60), nameAr: z.string().trim().max(60).optional(),
    description: z.string().trim().min(5, "Description required").max(400), image: z.string().trim().max(300).optional(),
    sortOrder: z.coerce.number().int().min(0).max(999),
  }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { ok: false, message: "Please check the fields.", errors: fieldErrors(s.error.issues) };
  const id = str(fd, "id");
  const v = { ...s.data, nameAr: s.data.nameAr || null, image: s.data.image || null };
  if (id) await db.update(schema.categories).set(v).where(eq(schema.categories.id, id));
  else {
    const slug = slugify(v.name);
    if (await db.query.categories.findFirst({ where: eq(schema.categories.slug, slug) })) return { ok: false, message: "A category with this name already exists." };
    await db.insert(schema.categories).values({ ...v, slug });
  }
  await audit(actorOf(u), id ? "category.update" : "category.create", "category", id || null, { name: v.name });
  revalidatePath("/", "layout");
  return { ok: true, message: "Category saved." };
}

// ======================= DISCOUNTS =======================
export async function saveDiscountAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff();
  const s = z.object({
    code: z.string().trim().toUpperCase().min(3, "3+ characters").max(30).regex(/^[A-Z0-9-]+$/, "Letters, numbers and - only"),
    type: z.enum(["PERCENT", "FIXED"]), value: z.string().trim().min(1, "Required"),
    minSubtotal: z.string().trim().optional(), maxUses: z.string().trim().optional(), expiresAt: z.string().trim().optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!s.success) return { ok: false, message: "Please check the fields.", errors: fieldErrors(s.error.issues) };
  const d = s.data;
  const value = d.type === "PERCENT" ? Number(d.value) : parseMajor(d.value, 2);
  if (value === null || !Number.isFinite(value) || value <= 0 || (d.type === "PERCENT" && (value > 100 || !Number.isInteger(value))))
    return { ok: false, message: d.type === "PERCENT" ? "Percent must be a whole number 1-100." : "Enter a valid AED amount.", errors: { value: "Invalid" } };
  const minSubtotalFils = d.minSubtotal ? parseMajor(d.minSubtotal, 2) : 0;
  if (minSubtotalFils === null) return { ok: false, message: "Invalid minimum spend.", errors: { minSubtotal: "Invalid" } };
  const maxUses = d.maxUses ? Number(d.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { ok: false, message: "Max uses must be a whole number.", errors: { maxUses: "Invalid" } };
  const expiresAt = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+04:00`) : null;
  if (expiresAt && isNaN(expiresAt.getTime())) return { ok: false, message: "Invalid expiry date.", errors: { expiresAt: "Invalid" } };
  const id = str(fd, "id");
  const v = { code: d.code, type: d.type, value, minSubtotalFils, maxUses, expiresAt, isActive: fd.get("isActive") === "on" };
  const dup = await db.query.discountCodes.findFirst({ where: eq(schema.discountCodes.code, d.code) });
  if (dup && dup.id !== id) return { ok: false, message: "This code already exists.", errors: { code: "Already exists" } };
  if (id) await db.update(schema.discountCodes).set(v).where(eq(schema.discountCodes.id, id));
  else await db.insert(schema.discountCodes).values(v);
  await audit(actorOf(u), id ? "discount.update" : "discount.create", "discount", id || d.code, v);
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Discount saved." };
}

// ======================= CURRENCIES (ADMIN) =======================
export async function saveCurrencyAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff(true);
  const code = str(fd, "code");
  const rate = Number(str(fd, "rate"));
  const cur = await db.query.currencies.findFirst({ where: eq(schema.currencies.code, code) });
  if (!cur) return { ok: false, message: "Unknown currency." };
  if (cur.isBase) return { ok: false, message: "AED is the base currency and is always 1." };
  if (!Number.isFinite(rate) || rate <= 0 || rate > 10000) return { ok: false, message: "Enter a valid rate (units of this currency per 1 AED).", errors: { rate: "Invalid" } };
  const rateMicros = Math.round(rate * 1_000_000);
  const enabled = fd.get("enabled") === "on";
  await db.update(schema.currencies).set({ rateMicros, enabled }).where(eq(schema.currencies.code, code));
  await audit(actorOf(u), "currency.update", "currency", code, { from: cur.rateMicros / 1e6, to: rate, enabled });
  revalidatePath("/", "layout");
  return { ok: true, message: `${code} saved.` };
}

// ======================= SETTINGS (ADMIN) =======================
const settingsSchema = z.object({
  brandName: z.string().trim().min(1, "Required").max(60),
  legalName: z.string().trim().max(160), tradeLicenceNumber: z.string().trim().max(60), licenceAuthority: z.string().trim().max(160),
  businessAddress: z.string().trim().max(300), supportEmail: z.string().trim().email("Invalid email").or(z.literal("")),
  supportPhone: z.string().trim().max(30).regex(/^$|^\+?[0-9 ()-]{7,30}$/, "Invalid phone"), supportHours: z.string().trim().max(120),
  returnWindowDays: z.coerce.number().int().min(0).max(90), taxRateBps: z.string().trim(), taxRegistrationNumber: z.string().trim().max(30).regex(/^$|^\d{15}$/, "UAE TRN is 15 digits"),
  paymentProviderName: z.string().trim().min(1).max(80),
});

export async function saveSettingsAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff(true);
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const pct = Number(d.taxRateBps);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50) return { ok: false, message: "Tax rate must be between 0 and 50%.", errors: { taxRateBps: "Invalid" } };
  const taxEnabled = fd.get("taxEnabled") === "on";
  if (taxEnabled && !d.taxRegistrationNumber) return { ok: false, message: "Enter your VAT TRN before enabling tax.", errors: { taxRegistrationNumber: "Required when tax is enabled" } };
  const before = await db.query.storeSettings.findFirst();
  const values = {
    brandName: d.brandName, legalName: d.legalName || null, tradeLicenceNumber: d.tradeLicenceNumber || null, licenceAuthority: d.licenceAuthority || null,
    businessAddress: d.businessAddress || null, supportEmail: d.supportEmail || null, supportPhone: d.supportPhone || null, supportHours: d.supportHours || null,
    returnWindowDays: d.returnWindowDays, taxEnabled, taxRateBps: Math.round(pct * 100), taxRegistrationNumber: d.taxRegistrationNumber || null,
    pricesIncludeTax: fd.get("pricesIncludeTax") === "on", taxInvoiceConfirmed: taxEnabled && fd.get("taxInvoiceConfirmed") === "on",
    taxCountries: fd.getAll("taxCountries").map(String).filter((c) => /^[A-Z]{2}$/.test(c)),
    paymentProviderName: d.paymentProviderName, confirmedFields: fd.getAll("confirmed").map(String),
  };
  await db.update(schema.storeSettings).set(values).where(eq(schema.storeSettings.id, 1));
  const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => JSON.stringify((before as Record<string, unknown>)?.[k]) !== JSON.stringify(v)));
  await audit(actorOf(u), "settings.update", "settings", "1", { changed });
  invalidateSettings();
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function saveZonesAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff(true);
  const ids = fd.getAll("zid").map(String);
  const zones: DeliveryZone[] = [];
  for (const [i, zid] of ids.entries()) {
    const fee = parseMajor(String(fd.getAll("fee")[i] ?? ""), 2);
    const freeRaw = String(fd.getAll("freeOver")[i] ?? "").trim();
    const free = freeRaw ? parseMajor(freeRaw, 2) : null;
    const country = String(fd.getAll("country")[i] ?? "").toUpperCase();
    const region = String(fd.getAll("region")[i] ?? "").trim() || null;
    const eta = String(fd.getAll("eta")[i] ?? "").trim();
    if (fee === null || (freeRaw && free === null) || !/^[A-Z]{2}$/.test(country) || !eta) return { ok: false, message: `Row ${i + 1}: check country, fee, free-over and ETA.` };
    if (fd.getAll("delete").map(String).includes(zid)) continue;
    zones.push({ id: zid, label: region ? `${country} - ${region}` : country, country, region, feeFils: fee, freeOverFils: free, etaDays: eta, enabled: fd.getAll("enabled").map(String).includes(zid) });
  }
  const newCountry = str(fd, "newCountry").toUpperCase();
  if (newCountry) {
    const fee = parseMajor(str(fd, "newFee"), 2);
    if (!/^[A-Z]{2}$/.test(newCountry) || fee === null) return { ok: false, message: "New zone: enter a 2-letter country code and a fee." };
    zones.push({ id: `z-${Date.now()}`, label: newCountry, country: newCountry, region: str(fd, "newRegion") || null, feeFils: fee, freeOverFils: null, etaDays: str(fd, "newEta") || "5-10", enabled: true });
  }
  await db.update(schema.storeSettings).set({ deliveryZones: zones }).where(eq(schema.storeSettings.id, 1));
  await audit(actorOf(u), "settings.zones", "settings", "1", { zones: zones.length });
  invalidateSettings();
  revalidatePath("/", "layout");
  return { ok: true, message: "Delivery zones saved." };
}

// ======================= POLICIES (ADMIN) =======================
export async function savePolicyAction(_p: AdminState, fd: FormData): Promise<AdminState> {
  const u = await requireStaff(true);
  const slug = str(fd, "slug"), title = str(fd, "title").slice(0, 120), content = String(fd.get("content") ?? "");
  if (!title || content.trim().length < 50) return { ok: false, message: "Title and content (50+ characters) are required." };
  const approved = fd.get("approved") === "on";
  await db.update(schema.policyPages).set({ title, content, needsReview: !approved }).where(eq(schema.policyPages.slug, slug));
  await audit(actorOf(u), "policy.update", "policy", slug, { approved, length: content.length });
  revalidatePath(`/policies/${slug}`);
  return { ok: true, message: approved ? "Saved and marked as approved." : "Saved (still marked as needing review)." };
}

// ======================= REVIEWS / USERS / MESSAGES =======================
export async function moderateReviewAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "id"), status = str(fd, "status");
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return;
  await db.update(schema.reviews).set({ status: status as "APPROVED" }).where(eq(schema.reviews.id, id));
  await audit(actorOf(u), "review.moderate", "review", id, { status });
  revalidatePath("/admin/reviews");
  revalidatePath("/product/[slug]", "page");
}

export async function setRoleAction(fd: FormData) {
  const u = await requireStaff(true);
  const id = str(fd, "id"), role = str(fd, "role");
  if (!["CUSTOMER", "STAFF", "ADMIN"].includes(role)) return;
  if (id === u.id) return; // can't change own role
  if (role !== "ADMIN") {
    const admins = await db.$count(schema.users, eq(schema.users.role, "ADMIN"));
    const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (target?.role === "ADMIN" && admins <= 1) return;
  }
  await db.update(schema.users).set({ role: role as "ADMIN", sessionVersion: sql`${schema.users.sessionVersion} + 1` }).where(eq(schema.users.id, id));
  await audit(actorOf(u), "user.role", "user", id, { role });
  revalidatePath("/admin/customers");
}

export async function markMessagesAction(fd: FormData) {
  await requireStaff();
  const ids = fd.getAll("id").map(String);
  const handled = fd.get("handled") === "1";
  if (ids.length) await db.update(schema.contactMessages).set({ handled }).where(inArray(schema.contactMessages.id, ids));
  revalidatePath("/admin/messages");
}
