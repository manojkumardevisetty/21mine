import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { countryName } from "./countries";
import { env } from "./env";
import { getProvider } from "./payments";
import type { Settings } from "./settings";

const NOT_SET = "[not yet provided]";

export function policyTokens(s: Settings, updatedAt: Date): Record<string, string> {
  let provider = s.paymentProviderName;
  try { const p = getProvider(); if (p.simulated) provider = "our payment provider (to be confirmed before launch)"; } catch { /* production w/o provider */ }
  const zones = s.deliveryZones.filter((z) => z.enabled);
  const aed = (f: number) => `AED ${(f / 100).toFixed(2)}`;
  const table = zones.length
    ? `| Destination | Fee | Free delivery over | Estimated time |\n|---|---|---|---|\n` +
      zones.map((z) => `| ${z.country === "AE" ? `UAE - ${z.region ?? "All emirates"}` : countryName(z.country)} | ${aed(z.feeFils)} | ${z.freeOverFils ? aed(z.freeOverFils) : "-"} | ${z.etaDays} business days |`).join("\n")
    : "Delivery zones have not been configured yet.";
  const taxStatement = s.taxEnabled && s.taxRegistrationNumber
    ? `Prices ${s.pricesIncludeTax ? "include" : "exclude"} UAE VAT at ${(s.taxRateBps / 100).toFixed(0)}% for deliveries within ${s.taxCountries.map(countryName).join(", ")} (TRN ${s.taxRegistrationNumber}).`
    : "VAT is not currently charged on orders. If this changes, prices and invoices will show VAT clearly.";
  const contact = [
    `- **Email:** [${s.supportEmail ?? NOT_SET}](mailto:${s.supportEmail ?? ""})`,
    `- **General enquiries:** [info@21mine.shop](mailto:info@21mine.shop)`,
    s.supportPhone ? `- **Phone / WhatsApp:** ${s.supportPhone}` : "",
    s.supportHours ? `- **Hours:** ${s.supportHours}` : "",
    `- **Address:** ${s.businessAddress ?? NOT_SET}`,
  ].filter(Boolean).join("\n");
  return {
    brandName: s.brandName, legalName: s.legalName ?? NOT_SET, tradeLicence: s.tradeLicenceNumber ?? NOT_SET,
    licenceAuthority: s.licenceAuthority ?? NOT_SET, address: s.businessAddress ?? NOT_SET,
    supportEmail: s.supportEmail ?? NOT_SET, siteUrl: env.appUrl.replace(/^https?:\/\//, ""),
    paymentProvider: provider, returnDays: String(s.returnWindowDays), deliveryTable: table,
    taxStatement, contactBlock: contact,
    updated: updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export function fillTokens(content: string, tokens: Record<string, string>) {
  return content.replace(/\{\{(\w+)\}\}/g, (_m, k) => tokens[k] ?? `{{${k}}}`);
}

export async function listPolicies() {
  return db.select({ slug: schema.policyPages.slug, title: schema.policyPages.title, needsReview: schema.policyPages.needsReview, updatedAt: schema.policyPages.updatedAt })
    .from(schema.policyPages).orderBy(asc(schema.policyPages.sortOrder));
}
export async function getPolicy(slug: string) {
  return db.query.policyPages.findFirst({ where: eq(schema.policyPages.slug, slug) });
}
