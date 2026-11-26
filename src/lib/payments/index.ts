import { env } from "../env";
import { hostedProvider } from "./hosted";
import { simulatedProvider } from "./simulated";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  simulated: simulatedProvider,
  hosted: hostedProvider,
};

export function getProvider(id?: string): PaymentProvider {
  const p = providers[id ?? env.paymentProvider];
  if (!p) throw new Error(`Unknown payment provider "${id ?? env.paymentProvider}"`);
  // Safety: simulated payments can never be used when the store runs in production mode
  if (p.simulated && env.storeMode === "production") throw new Error("Simulated payments are disabled in production mode");
  return p;
}

export function getProviderById(id: string) { return providers[id] ?? null; }
export type { PaymentProvider } from "./types";
