// Currency helpers. Catalogue prices are AED fils; orders are charged in a chosen currency.
export const BASE_CURRENCY = "AED";

export type CurrencyInfo = {
  code: string;
  symbol: string;
  exponent: number; // minor-unit digits (AED/USD 2, KWD/BHD/OMR 3, JPY 0)
  rateMicros: number; // 1 AED = rateMicros / 1e6 units of this currency
};

export const AED: CurrencyInfo = { code: "AED", symbol: "AED", exponent: 2, rateMicros: 1_000_000 };

/** Convert AED fils into minor units of `cur` (round half up, exact integer maths). */
export function convertFils(fils: number, cur: CurrencyInfo): number {
  if (cur.code === BASE_CURRENCY) return fils;
  const num = BigInt(fils) * BigInt(cur.rateMicros) * 10n ** BigInt(cur.exponent);
  const den = 100n * 1_000_000n;
  const q = num / den;
  const r = num % den;
  return Number(r * 2n >= den ? q + 1n : q);
}

/** Convert minor units of `cur` back to AED fils (reporting only). */
export function toBaseFils(minor: number, cur: CurrencyInfo): number {
  if (cur.code === BASE_CURRENCY) return minor;
  const num = BigInt(minor) * 100n * 1_000_000n;
  const den = BigInt(cur.rateMicros) * 10n ** BigInt(cur.exponent);
  return Number((num + den / 2n) / den);
}

export function formatMinor(minor: number, code: string, exponent = 2, locale = "en"): string {
  const value = minor / 10 ** exponent;
  const loc = locale === "ar" ? "ar-AE" : "en-AE";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency", currency: code, currencyDisplay: code === "AED" ? "code" : "symbol",
      minimumFractionDigits: exponent, maximumFractionDigits: exponent,
    }).format(value).replace(/ /g, " ");
  } catch {
    return `${code} ${value.toFixed(exponent)}`;
  }
}

/** Plain, PDF-safe formatting (no locale symbols): "AED 1,234.50" */
export function formatPlain(minor: number, code: string, exponent = 2): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const int = Math.floor(abs / 10 ** exponent);
  const frac = abs % 10 ** exponent;
  const intStr = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const s = exponent > 0 ? `${intStr}.${frac.toString().padStart(exponent, "0")}` : intStr;
  return `${neg ? "-" : ""}${code} ${s}`;
}

/** Parse "149.50" (major units) into minor units; returns null when invalid. */
export function parseMajor(input: string, exponent = 2): number | null {
  const t = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [i, f = ""] = t.split(".");
  if (f.length > exponent) return null;
  return Number(i) * 10 ** exponent + Number((f + "0".repeat(exponent)).slice(0, exponent) || 0);
}
