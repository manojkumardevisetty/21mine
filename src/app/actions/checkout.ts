"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { loadCart, readCartId } from "@/lib/cart";
import { checkoutSchema, CheckoutError, placeOrder, quoteCart } from "@/lib/checkout";
import { formatMinor } from "@/lib/money";
import { rateLimit } from "@/lib/ratelimit";
import { expireStaleOrders } from "@/lib/payments/apply";

export type QuoteView = {
  ok: boolean; currency: string; subtotal: string; discount: string | null; discountCode: string | null;
  discountMessage: string | null; shipping: string | null; tax: string | null; taxLabel: string | null;
  total: string; totalMinor: number; deliverable: boolean; empty: boolean;
};

export async function quoteAction(input: { country: string; region: string; discountCode: string; currency: string }): Promise<QuoteView> {
  const cart = await loadCart(await readCartId());
  const lines = cart.lines.map((l) => ({ variantId: l.variantId, unitPriceFils: l.unitPriceFils, quantity: l.quantity }));
  const q = await quoteCart({ lines, currencyCode: input.currency, country: input.country || null, region: input.region || null, discountCode: input.discountCode || null });
  const m = (v: number) => formatMinor(v, q.currency, q.exponent);
  return {
    ok: true, currency: q.currency, subtotal: m(q.subtotalMinor),
    discount: q.discountMinor ? `-${m(q.discountMinor)}` : null, discountCode: q.discountCode,
    discountMessage: input.discountCode ? (q.discountInvalid ? "This code is invalid or has expired." : q.discountError === "minimum" ? "Your bag doesn't meet this code's minimum spend." : q.discountCode ? `Code ${q.discountCode} applied.` : null) : null,
    shipping: q.shippingAvailable ? (q.shippingMinor ? m(q.shippingMinor) : "Free") : null,
    tax: q.taxRateBps ? m(q.taxMinor) : null,
    taxLabel: q.taxRateBps ? `VAT ${(q.taxRateBps / 100).toFixed(0)}%${q.taxInclusive ? " (included)" : ""}` : null,
    total: m(q.totalMinor), totalMinor: q.totalMinor, deliverable: q.shippingAvailable, empty: lines.length === 0,
  };
}

export type CheckoutState = { ok: false; message: string; errors?: Record<string, string> } | null;

export async function placeOrderAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const session = await auth();
  const cartId = await readCartId();
  if (!cartId) return { ok: false, message: "Your bag is empty or has expired." };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please check the highlighted fields.", errors };
  }
  if (!(await rateLimit(`checkout:${cartId}`, 20, 600))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
  await expireStaleOrders().catch(() => 0);
  let url: string;
  try {
    const res = await placeOrder(parsed.data, { cartId, userId: session?.user?.id ?? null });
    url = res.redirectUrl;
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, message: e.message, errors: e.field ? { [e.field]: e.message } : undefined };
    console.error("[checkout]", e);
    return { ok: false, message: "We couldn't place your order. You have not been charged. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(url);
}
