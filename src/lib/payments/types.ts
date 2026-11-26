// Gateway-neutral payment contract. Checkout only talks to this interface, so an approved
// international gateway (Stripe, Checkout.com, Network International N-Genius, Telr, ...)
// can be plugged in without touching checkout code.
export type PaymentMethodId = "credit_card" | "debit_card" | "apple_pay" | "google_pay";

export type PaymentMethodOption = { id: PaymentMethodId; label: string; description: string };

export type CreatePaymentInput = {
  paymentId: string; orderId: string; orderNumber: string;
  amountMinor: number; currency: string; method: PaymentMethodId;
  customerEmail: string; returnUrl: string; cancelUrl: string;
};

export type VerifiedPaymentEvent = {
  providerRef: string; // our payment reference echoed by the provider
  providerEventId: string; // unique per event — used for idempotency
  type: "succeeded" | "failed" | "cancelled" | "refunded";
  amountMinor: number; currency: string; payload: Record<string, unknown>;
};

export interface PaymentProvider {
  id: string;
  label: string;
  simulated: boolean;
  /** Methods to show. Live providers must only return methods that are approved & configured. */
  methods(ctx: { currency: string; userAgent?: string | null }): PaymentMethodOption[];
  /** Create a hosted payment session; returns where to send the customer. */
  createPayment(input: CreatePaymentInput): Promise<{ providerRef: string; redirectUrl: string }>;
  /** Verify signature of an incoming webhook and normalise it. Return null if not relevant. */
  verifyWebhook?(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | null>;
  refund?(p: { providerRef: string; amountMinor: number; currency: string }): Promise<{ providerEventId: string }>;
  supportedCurrencies?: string[] | "all";
}
