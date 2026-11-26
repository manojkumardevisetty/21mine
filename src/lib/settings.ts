import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DeliveryZone, MerchantSnapshot } from "@/db/schema";

export type Settings = typeof schema.storeSettings.$inferSelect;

// Facts taken from the uploaded licence (DIEZ / IFZA licence no. 18250) and the owner's instructions.
export const DEFAULT_SETTINGS = {
  id: 1,
  brandName: "21mine",
  legalName: "XENTERPRISES DIGITAL SERVICES - FZCO",
  tradeLicenceNumber: "18250",
  licenceAuthority: "Dubai Integrated Economic Zones Authority (IFZA)",
  businessAddress: "Premises DSO-IFZA, IFZA Properties, Dubai Silicon Oasis, Dubai, United Arab Emirates",
  supportEmail: "support@21mine.shop",
  supportPhone: null as string | null, // not provided - never invented
  supportHours: "Sunday to Friday, 10:00 - 19:00 (GST)",
  deliveryZones: [] as DeliveryZone[],
  returnWindowDays: 7,
  taxEnabled: false, // enable only after VAT registration is confirmed
  taxRateBps: 500,
  taxRegistrationNumber: null as string | null,
  pricesIncludeTax: true,
  taxInvoiceConfirmed: false,
  taxCountries: ["AE"],
  paymentProviderName: "Simulated (demo)",
};

let cache: { at: number; value: Settings } | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 5_000) return cache.value;
  const row = await db.query.storeSettings.findFirst({ where: eq(schema.storeSettings.id, 1) });
  if (!row) throw new Error("Store settings missing - run `npm run db:seed`.");
  cache = { at: Date.now(), value: row };
  return row;
}
export function invalidateSettings() { cache = null; }

/** Launch-critical fields that are empty or still unconfirmed by the merchant. */
export function missingMerchantInfo(s: Settings): { key: string; label: string; reason: string }[] {
  const out: { key: string; label: string; reason: string }[] = [];
  const need = (key: keyof Settings, label: string) => {
    if (!s[key]) out.push({ key, label, reason: "Not provided" });
  };
  need("legalName", "Legal business name");
  need("tradeLicenceNumber", "Trade licence number");
  need("businessAddress", "Business address");
  need("supportEmail", "Support email");
  need("supportPhone", "Support phone number");
  if (!s.deliveryZones.some((z) => z.enabled)) out.push({ key: "deliveryZones", label: "Delivery zones", reason: "No delivery zone enabled" });
  if (s.taxEnabled && !s.taxRegistrationNumber) out.push({ key: "taxRegistrationNumber", label: "VAT TRN", reason: "Tax enabled without a TRN" });
  if (!s.taxEnabled) out.push({ key: "taxEnabled", label: "VAT status", reason: "VAT registration status not confirmed - tax is off" });
  return out;
}

export function merchantSnapshot(s: Settings): MerchantSnapshot {
  const taxInvoice = s.taxEnabled && s.taxInvoiceConfirmed && !!s.taxRegistrationNumber;
  return {
    brandName: s.brandName, legalName: s.legalName, tradeLicenceNumber: s.tradeLicenceNumber,
    licenceAuthority: s.licenceAuthority, businessAddress: s.businessAddress,
    supportEmail: s.supportEmail, supportPhone: s.supportPhone,
    taxRegistrationNumber: taxInvoice ? s.taxRegistrationNumber : null,
    taxInvoice, pricesIncludeTax: s.pricesIncludeTax,
  };
}

export function findZone(zones: DeliveryZone[], country: string, region: string | null | undefined) {
  const enabled = zones.filter((z) => z.enabled && z.country === country);
  return (
    enabled.find((z) => z.region && region && z.region.toLowerCase() === region.toLowerCase()) ??
    enabled.find((z) => !z.region) ??
    null
  );
}
