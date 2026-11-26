import { describe, expect, it } from "vitest";
import { convertFils, formatPlain, parseMajor, toBaseFils } from "@/lib/money";
import { computeQuote } from "@/lib/pricing";
import { createOrderToken, verifyOrderToken } from "@/lib/tokens";
import { renderMarkdown } from "@/lib/markdown";

const USD = { code: "USD", symbol: "$", exponent: 2, rateMicros: 272294 };
const KWD = { code: "KWD", symbol: "KWD", exponent: 3, rateMicros: 83594 };
const AED = { code: "AED", symbol: "AED", exponent: 2, rateMicros: 1_000_000 };

describe("money", () => {
  it("converts AED fils to other currencies with exact rounding", () => {
    expect(convertFils(24900, AED)).toBe(24900);
    expect(convertFils(24900, USD)).toBe(6780); // 249 AED * 0.272294 = 67.80 USD
    expect(convertFils(24900, KWD)).toBe(20815); // 3-decimal currency
    expect(toBaseFils(6780, USD)).toBe(24900);
  });
  it("parses and formats", () => {
    expect(parseMajor("149.5")).toBe(14950);
    expect(parseMajor("1,234.56")).toBe(123456);
    expect(parseMajor("1.234")).toBeNull();
    expect(parseMajor("abc")).toBeNull();
    expect(formatPlain(123456, "AED")).toBe("AED 1,234.56");
    expect(formatPlain(20815, "KWD", 3)).toBe("KWD 20.815");
  });
});

describe("pricing", () => {
  const zone = { id: "z", label: "Dubai", country: "AE", region: "Dubai", feeFils: 1500, freeOverFils: 20000, etaDays: "1-2", enabled: true };
  const tax = { enabled: false, rateBps: 500, inclusive: true, applies: true };
  it("adds delivery under the free threshold and zero above it", () => {
    const q1 = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 6900, quantity: 2 }], currency: AED, zone, tax });
    expect(q1).toMatchObject({ subtotalMinor: 13800, shippingMinor: 1500, totalMinor: 15300 });
    const q2 = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 24900, quantity: 1 }], currency: AED, zone, tax });
    expect(q2).toMatchObject({ shippingMinor: 0, totalMinor: 24900 });
  });
  it("line totals equal unit x qty in the charge currency", () => {
    const q = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 13900, quantity: 3 }], currency: USD, zone, tax });
    expect(q.lines[0].lineMinor).toBe(q.lines[0].unitMinor * 3);
    expect(q.totalMinor).toBe(q.subtotalMinor + q.shippingMinor);
  });
  it("applies discounts, caps them, and checks minimum spend", () => {
    const pct = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 10000, quantity: 1 }], currency: AED, zone, tax, discount: { code: "X", type: "PERCENT", value: 10, minSubtotalFils: 0 } });
    expect(pct.discountMinor).toBe(1000);
    const fixed = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 1000, quantity: 1 }], currency: AED, zone, tax, discount: { code: "Y", type: "FIXED", value: 5000, minSubtotalFils: 0 } });
    expect(fixed.discountMinor).toBe(1000);
    const min = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 1000, quantity: 1 }], currency: AED, zone, tax, discount: { code: "Z", type: "PERCENT", value: 10, minSubtotalFils: 5000 } });
    expect(min.discountError).toBe("minimum");
    expect(min.discountMinor).toBe(0);
  });
  it("computes inclusive and exclusive VAT", () => {
    const inc = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 10500, quantity: 1 }], currency: AED, zone: { ...zone, freeOverFils: 1 }, tax: { ...tax, enabled: true } });
    expect(inc).toMatchObject({ taxMinor: 500, totalMinor: 10500 });
    const exc = computeQuote({ lines: [{ variantId: "a", unitPriceFils: 10000, quantity: 1 }], currency: AED, zone: { ...zone, freeOverFils: 1 }, tax: { ...tax, enabled: true, inclusive: false } });
    expect(exc).toMatchObject({ taxMinor: 500, totalMinor: 10500 });
  });
});

describe("guest order tokens", () => {
  it("verifies, rejects tampering and expiry", () => {
    const t = createOrderToken("order-1");
    expect(verifyOrderToken("order-1", t)).toBe(true);
    expect(verifyOrderToken("order-2", t)).toBe(false);
    expect(verifyOrderToken("order-1", t.replace(/.$/, (c) => (c === "a" ? "b" : "a")))).toBe(false);
    const expired = `${Math.floor(Date.now() / 1000) - 10}.${t.split(".")[1]}`;
    expect(verifyOrderToken("order-1", expired)).toBe(false);
    expect(verifyOrderToken("order-1", null)).toBe(false);
  });
});

describe("markdown", () => {
  it("escapes HTML and blocks javascript links", () => {
    const html = renderMarkdown("Hello <script>alert(1)</script> [x](javascript:alert(1)) [ok](/policies/terms)");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('href="/policies/terms"');
  });
});
