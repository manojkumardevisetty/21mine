// Pure pricing engine — used by cart, checkout and tests. All server-side.
import { convertFils, type CurrencyInfo } from "./money";
import type { DeliveryZone } from "@/db/schema";

export type PricingLine = { variantId: string; unitPriceFils: number; quantity: number };
export type PricingDiscount = {
  code: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalFils: number;
};
export type PricingInput = {
  lines: PricingLine[];
  currency: CurrencyInfo;
  zone: DeliveryZone | null; // null = delivery not available / not chosen yet
  discount?: PricingDiscount | null;
  tax: { enabled: boolean; rateBps: number; inclusive: boolean; applies: boolean };
};
export type Quote = {
  currency: string; exponent: number; fxRateMicros: number;
  lines: { variantId: string; unitMinor: number; quantity: number; lineMinor: number }[];
  subtotalMinor: number; discountMinor: number; discountCode: string | null;
  discountError: string | null;
  shippingMinor: number; shippingAvailable: boolean;
  taxMinor: number; taxRateBps: number; taxInclusive: boolean;
  totalMinor: number;
};

export function computeQuote(input: PricingInput): Quote {
  const cur = input.currency;
  const lines = input.lines.map((l) => {
    const unitMinor = convertFils(l.unitPriceFils, cur);
    return { variantId: l.variantId, unitMinor, quantity: l.quantity, lineMinor: unitMinor * l.quantity };
  });
  const subtotalMinor = lines.reduce((s, l) => s + l.lineMinor, 0);
  const subtotalFils = input.lines.reduce((s, l) => s + l.unitPriceFils * l.quantity, 0);

  let discountMinor = 0;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  const d = input.discount;
  if (d) {
    if (subtotalFils < d.minSubtotalFils) {
      discountError = "minimum";
    } else {
      discountCode = d.code;
      discountMinor = d.type === "PERCENT"
        ? Math.round((subtotalMinor * Math.min(100, Math.max(0, d.value))) / 100)
        : convertFils(d.value, cur);
      discountMinor = Math.min(discountMinor, subtotalMinor);
    }
  }

  let shippingMinor = 0;
  const zone = input.zone;
  if (zone) {
    const freeOver = zone.freeOverFils ?? null;
    const free = freeOver !== null && freeOver > 0 && subtotalFils >= freeOver;
    shippingMinor = free ? 0 : convertFils(zone.feeFils, cur);
  }

  const taxable = subtotalMinor - discountMinor + shippingMinor;
  let taxMinor = 0;
  const t = input.tax;
  const taxOn = t.enabled && t.applies && t.rateBps > 0;
  if (taxOn) {
    taxMinor = t.inclusive
      ? Math.round((taxable * t.rateBps) / (10_000 + t.rateBps)) // portion already included
      : Math.round((taxable * t.rateBps) / 10_000);
  }
  const totalMinor = taxable + (taxOn && !t.inclusive ? taxMinor : 0);

  return {
    currency: cur.code, exponent: cur.exponent, fxRateMicros: cur.rateMicros,
    lines, subtotalMinor, discountMinor, discountCode, discountError,
    shippingMinor, shippingAvailable: !!zone,
    taxMinor, taxRateBps: taxOn ? t.rateBps : 0, taxInclusive: t.inclusive,
    totalMinor,
  };
}
