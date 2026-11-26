import type { PaymentProvider } from "./types";
import { randomToken } from "../tokens";

// Demo-only provider. Never collects or asks for card numbers, CVV or wallet credentials.
export const simulatedProvider: PaymentProvider = {
  id: "simulated",
  label: "Simulated payment (demo - no money is collected)",
  simulated: true,
  supportedCurrencies: "all",
  methods() {
    return [
      { id: "credit_card", label: "Credit card (simulated)", description: "No card details are requested." },
      { id: "debit_card", label: "Debit card (simulated)", description: "No card details are requested." },
      { id: "apple_pay", label: "Apple Pay (simulated)", description: "No wallet sign-in is requested." },
      { id: "google_pay", label: "Google Pay (simulated)", description: "No wallet sign-in is requested." },
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
