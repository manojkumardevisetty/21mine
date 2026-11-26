import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { countryName } from "./countries";
import { formatPlain } from "./money";
import { PAYMENT_STATUS_LABEL } from "./orders";
import type { schema } from "@/db";

type Order = typeof schema.orders.$inferSelect & { items: (typeof schema.orderItems.$inferSelect)[] };

const CHAR = rgb(0.17, 0.17, 0.17);
const MUTED = rgb(0.42, 0.42, 0.42);
const ROSE = rgb(0.69, 0.48, 0.48);
const LINE = rgb(0.88, 0.85, 0.81);

// Standard PDF fonts only support WinAnsi; normalise anything else.
const safe = (s: string | null | undefined) =>
  (s ?? "").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/×/g, "x").replace(/[^\x20-\x7E -ÿ]/g, "");

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderInvoicePdf(order: Order): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const m = order.merchantSnapshot;
  const docTitle = m.taxInvoice ? "TAX INVOICE" : "INVOICE";
  pdf.setTitle(`${docTitle} ${order.invoiceNumber ?? order.number}`);
  pdf.setAuthor(m.legalName ?? m.brandName);
  pdf.setCreator("21mine");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const W = 595.28, H = 841.89, L = 48, R = W - 48;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - 56;
  const money = (v: number) => formatPlain(v, order.currency, order.currencyExponent);
  const text = (s: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const size = o.size ?? 9.5, font = o.font ?? regular, str = safe(s);
    const xx = o.right ? x - font.widthOfTextAtSize(str, size) : x;
    page.drawText(str, { x: xx, y: yy, size, font, color: o.color ?? CHAR });
  };

  // Brand mark
  text("21", L, y - 6, { size: 30, font: serif });
  text("mine", L + serif.widthOfTextAtSize("21", 30) + 1, y - 6, { size: 30, font: serif, color: ROSE });
  text(docTitle, R, y, { size: 16, font: bold, right: true });
  text(`No. ${order.invoiceNumber ?? "-"}`, R, y - 16, { size: 9.5, right: true, color: MUTED });
  y -= 44;

  // Merchant / meta
  const left: string[] = [
    m.legalName ?? "Legal name not configured",
    ...(m.businessAddress ? wrap(m.businessAddress, regular, 9, 260) : ["Business address not configured"]),
    m.tradeLicenceNumber ? `Trade licence ${m.tradeLicenceNumber}${m.licenceAuthority ? ` - ${m.licenceAuthority}` : ""}` : "",
    m.taxInvoice && m.taxRegistrationNumber ? `TRN: ${m.taxRegistrationNumber}` : "",
    [m.supportEmail, m.supportPhone].filter(Boolean).join("  |  "),
  ].filter(Boolean);
  left.forEach((l, i) => text(l, L, y - i * 12.5, { size: 9, font: i === 0 ? bold : regular, color: i === 0 ? CHAR : MUTED }));
  const issued = (order.invoiceIssuedAt ?? order.createdAt).toISOString().slice(0, 10);
  const meta: [string, string][] = [
    ["Issue date", issued],
    ["Order reference", order.number],
    ["Order date", order.createdAt.toISOString().slice(0, 10)],
    ["Payment status", PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus],
    ["Payment method", order.paymentMethod.replace("_", " ")],
    ["Currency", order.currency],
  ];
  meta.forEach(([k, v], i) => {
    text(k, R - 190, y - i * 12.5, { size: 9, color: MUTED });
    text(v, R, y - i * 12.5, { size: 9, font: bold, right: true });
  });
  y -= Math.max(left.length, meta.length) * 12.5 + 18;

  // Bill / ship to
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.6, color: LINE });
  y -= 16;
  text("BILL TO / DELIVER TO", L, y, { size: 8, font: bold, color: MUTED });
  y -= 13;
  const addr = [
    order.shipName, order.email, order.shipPhone,
    [order.shipBuilding, order.shipUnit].filter(Boolean).join(", "),
    [order.shipStreet, order.shipCity].filter(Boolean).join(", "),
    [order.shipRegion, order.shipPostalCode, countryName(order.shipCountry)].filter(Boolean).join(", "),
  ].filter(Boolean);
  addr.forEach((l, i) => text(l, L, y - i * 12, { size: 9.5 }));
  y -= addr.length * 12 + 16;

  // Items table
  const cols = { item: L, sku: 300, qty: 385, unit: 470, total: R };
  page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 20, color: rgb(0.96, 0.94, 0.91) });
  text("Item", cols.item + 6, y, { size: 8.5, font: bold });
  text("SKU", cols.sku, y, { size: 8.5, font: bold });
  text("Qty", cols.qty, y, { size: 8.5, font: bold, right: true });
  text("Unit price", cols.unit, y, { size: 8.5, font: bold, right: true });
  text("Amount", cols.total - 6, y, { size: 8.5, font: bold, right: true });
  y -= 24;
  for (const it of order.items) {
    const nameLines = wrap(`${it.productName} - ${it.variantName}`, regular, 9, 230);
    const needed = nameLines.length * 11.5 + 10;
    if (y - needed < 170) { page = pdf.addPage([W, H]); y = H - 60; }
    nameLines.forEach((l, i) => text(l, cols.item + 6, y - i * 11.5, { size: 9 }));
    text(it.sku, cols.sku, y, { size: 8.5, color: MUTED });
    text(String(it.quantity), cols.qty, y, { size: 9, right: true });
    text(money(it.unitPriceMinor), cols.unit, y, { size: 9, right: true });
    text(money(it.lineTotalMinor), cols.total - 6, y, { size: 9, right: true });
    y -= needed;
    page.drawLine({ start: { x: L, y: y + 5 }, end: { x: R, y: y + 5 }, thickness: 0.4, color: LINE });
  }

  // Totals
  y -= 8;
  const rows: [string, string, boolean?][] = [["Subtotal", money(order.subtotalMinor)]];
  if (order.discountMinor) rows.push([`Discount${order.discountCode ? ` (${order.discountCode})` : ""}`, `-${money(order.discountMinor)}`]);
  rows.push(["Delivery", order.shippingMinor ? money(order.shippingMinor) : "Free"]);
  if (order.taxRateBps > 0) {
    const pct = (order.taxRateBps / 100).toFixed(order.taxRateBps % 100 ? 2 : 0);
    rows.push([`VAT ${pct}%${m.pricesIncludeTax ? " (included)" : ""}`, money(order.taxMinor)]);
  }
  rows.push([`Total (${order.currency})`, money(order.totalMinor), true]);
  if (order.paymentStatus === "PAID") rows.push(["Amount paid", money(order.totalMinor)]);
  if (order.paymentStatus === "REFUNDED") rows.push(["Refunded", `-${money(order.totalMinor)}`]);
  for (const [k, v, strong] of rows) {
    if (strong) { page.drawLine({ start: { x: 330, y: y + 12 }, end: { x: R, y: y + 12 }, thickness: 0.8, color: CHAR }); }
    text(k, 340, y, { size: strong ? 11 : 9.5, font: strong ? bold : regular });
    text(v, R - 6, y, { size: strong ? 11 : 9.5, font: strong ? bold : regular, right: true });
    y -= strong ? 20 : 15;
  }

  // Notes
  y -= 10;
  const notes: string[] = [];
  if (order.currency !== "AED") notes.push(`Prices converted from AED at 1 AED = ${(order.fxRateMicros / 1e6).toFixed(6)} ${order.currency} at the time of purchase.`);
  if (order.taxRateBps === 0) notes.push("No VAT has been charged on this invoice.");
  if (order.isDemo) notes.push("Test transaction: no payment was collected for this order.");
  notes.push(`Thank you for shopping with ${m.brandName}. For help with this order contact ${m.supportEmail ?? "our support team"}.`);
  for (const n of notes) {
    for (const l of wrap(n, regular, 8.5, R - L)) { text(l, L, y, { size: 8.5, color: MUTED }); y -= 11; }
    y -= 3;
  }

  pdf.getPages().forEach((p, i, all) => {
    p.drawText(safe(`${m.brandName} - ${order.invoiceNumber ?? order.number} - page ${i + 1} of ${all.length}`), {
      x: L, y: 28, size: 7.5, font: regular, color: MUTED,
    });
  });
  return pdf.save();
}
