import type { PaymentProvider } from "./types";
import { randomToken } from "../tokens";

// Demo-only provider. Never collects or asks for card numbers, CVV or wallet credentials.
export const simulatedProvider: PaymentProvider = {
  id: "simulated",
  label: "Test payment (no money collected)",
  simulated: true,
  supportedCurrencies: "all",
  methods() {
    return [
      { id: "credit_card", label: "Credit card", description: "Test mode" },
      { id: "debit_card", label: "Debit card", description: "Test mode" },
      { id: "apple_pay", label: "Apple Pay", description: "Test mode" },
      { id: "google_pay", label: "Google Pay", description: "Test mode" },
    ];
  },
  async createPayment(input) {
    const providerRef = `sim_${randomToken(12)}`;
    return { providerRef, redirectUrl: `/pay/simulated/${input.paymentId}` };
  },
  async refund() {
    return { providerEventId: `sim_refund_${randomToken(12)}` };
  },
};
