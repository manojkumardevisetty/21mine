import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethodId, PaymentProvider, VerifiedPaymentEvent } from "./types";

/**
 * TEMPLATE for a live hosted-checkout gateway. It is NOT active until:
 *   PAYMENT_PROVIDER=hosted, GATEWAY_API_BASE, GATEWAY_API_KEY, GATEWAY_WEBHOOK_SECRET are set,
 *   and GATEWAY_ENABLED_METHODS lists only methods the gateway approved for this merchant.
 * Replace the request/response mapping below with the selected gateway's documented API
 * (create session, webhook signature scheme, refund endpoint). Card data never touches our servers.
 */
const enabled = () =>
  (process.env.GATEWAY_ENABLED_METHODS ?? "").split(",").map((s) => s.trim()).filter(Boolean) as string[];

const LABELS: Record<PaymentMethodId, string> = {
  credit_card: "Credit card", debit_card: "Debit card", apple_pay: "Apple Pay", google_pay: "Google Pay",
};

export const hostedProvider: PaymentProvider = {
  id: "hosted",
  label: "Card / wallet payment",
  simulated: false,
  supportedCurrencies: (process.env.GATEWAY_CURRENCIES ?? "").split(",").filter(Boolean),
  methods({ userAgent }) {
    const list = enabled();
    const ua = userAgent ?? "";
    const out: { id: PaymentMethodId; label: string; description: string }[] = [];
    if (list.includes("card")) {
      out.push({ id: "credit_card", label: LABELS.credit_card, description: "Pay securely on the gateway's hosted page." });
      out.push({ id: "debit_card", label: LABELS.debit_card, description: "Pay securely on the gateway's hosted page." });
    }
    // Wallet buttons: final eligibility is decided by the gateway's hosted page / wallet SDK.
    if (list.includes("apple_pay") && /iPhone|iPad|Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS/.test(ua))
      out.push({ id: "apple_pay", label: LABELS.apple_pay, description: "Available on supported Apple devices." });
    if (list.includes("google_pay") && /Chrome|Android/.test(ua))
      out.push({ id: "google_pay", label: LABELS.google_pay, description: "Available in supported browsers." });
    return out;
  },
  async createPayment(input) {
    const base = process.env.GATEWAY_API_BASE;
    const key = process.env.GATEWAY_API_KEY;
    if (!base || !key) throw new Error("Live gateway is not configured");
    const res = await fetch(`${base}/checkout/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": input.paymentId },
      body: JSON.stringify({
        amount: input.amountMinor, currency: input.currency, reference: input.paymentId,
        order_number: input.orderNumber, customer_email: input.customerEmail, payment_method: input.method,
        success_url: input.returnUrl, cancel_url: input.cancelUrl,
      }),
    });
    if (!res.ok) throw new Error(`Gateway error ${res.status}`);
    const data = (await res.json()) as { id: string; url: string };
    return { providerRef: data.id, redirectUrl: data.url };
  },
  async verifyWebhook(rawBody, headers): Promise<VerifiedPaymentEvent | null> {
    const secret = process.env.GATEWAY_WEBHOOK_SECRET;
    const sig = headers.get("x-signature") ?? "";
    if (!secret || !sig) return null;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected); const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const e = JSON.parse(rawBody) as {
      id: string; type: string; data: { session_id: string; amount: number; currency: string };
    };
    const map: Record<string, VerifiedPaymentEvent["type"]> = {
      "payment.succeeded": "succeeded", "payment.failed": "failed",
      "payment.cancelled": "cancelled", "payment.refunded": "refunded",
    };
    const type = map[e.type];
    if (!type) return null;
    return { providerRef: e.data.session_id, providerEventId: e.id, type, amountMinor: e.data.amount, currency: e.data.currency, payload: e };
  },
};
