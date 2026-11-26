import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { emailLayout, sendMail } from "./mail";
import { env } from "./env";
import { formatPlain } from "./money";
import { createOrderToken } from "./tokens";

export type OrderNotice = "paid" | "failed" | "cancelled" | "refunded" | "shipped" | "delivered";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function orderLink(orderId: string, number: string) {
  return `${env.appUrl}/orders/${encodeURIComponent(number)}?t=${createOrderToken(orderId)}`;
}

export async function notifyOrder(orderId: string, kind: OrderNotice) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!o) return;
  const money = (m: number) => formatPlain(m, o.currency, o.currencyExponent);
  const link = orderLink(o.id, o.number);
  const demo = o.isDemo ? "\n\nNOTE: This order was placed in demo mode. No payment was collected." : "";
  const lines = o.items.map((i) => `- ${i.productName} (${i.variantName}) x${i.quantity}: ${money(i.lineTotalMinor)}`).join("\n");

  const copy: Record<OrderNotice, { subject: string; intro: string }> = {
    paid: { subject: `Order ${o.number} confirmed`, intro: "Thank you for shopping with 21mine. Your payment was received and your order is confirmed." },
    failed: { subject: `Payment for order ${o.number} was not completed`, intro: "Your payment was declined. Your items are reserved for 60 minutes - you can retry payment from the link below." },
    cancelled: { subject: `Order ${o.number} cancelled`, intro: "Your order has been cancelled. If a payment was taken, it will be refunded to the original payment method." },
    refunded: { subject: `Refund for order ${o.number}`, intro: "A refund has been issued to your original payment method. Banks usually take 5-14 business days to show it." },
    shipped: { subject: `Order ${o.number} is on its way`, intro: `Your order has been shipped.${o.trackingNumber ? ` Tracking number: ${o.trackingNumber}.` : ""}` },
    delivered: { subject: `Order ${o.number} delivered`, intro: "Your order has been delivered. We hope you love it." },
  };
  const c = copy[kind];
  const text = `${c.intro}

Order: ${o.number}
${lines}
Subtotal: ${money(o.subtotalMinor)}${o.discountMinor ? `\nDiscount: -${money(o.discountMinor)}` : ""}
Delivery: ${money(o.shippingMinor)}${o.taxMinor ? `\nVAT${o.merchantSnapshot.pricesIncludeTax ? " (included)" : ""}: ${money(o.taxMinor)}` : ""}
Total: ${money(o.totalMinor)}

View your order and download your invoice: ${link}${demo}

Questions? Reply to this email or write to support@21mine.shop.`;
  const html = emailLayout(esc(c.subject), `<p>${esc(c.intro)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${o.items.map((i) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.productName)} <span style="color:#777">(${esc(i.variantName)}) × ${i.quantity}</span></td><td style="text-align:right;border-bottom:1px solid #eee">${money(i.lineTotalMinor)}</td></tr>`).join("")}
<tr><td style="padding-top:10px"><strong>Total</strong></td><td style="text-align:right;padding-top:10px"><strong>${money(o.totalMinor)}</strong></td></tr></table>
<p><a href="${link}" style="display:inline-block;margin-top:20px;background:#2B2B2B;color:#fff;padding:12px 20px;text-decoration:none;border-radius:999px">View order</a></p>
${o.isDemo ? `<p style="color:#9a5b5b;font-size:13px">Demo mode: no payment was collected.</p>` : ""}`);
  await sendMail({ to: o.email, subject: c.subject, text, html, replyTo: "support@21mine.shop" });

  if (kind === "paid") {
    await sendMail({
      to: env.notifyEmail,
      subject: `New order ${o.number} - ${money(o.totalMinor)}`,
      text: `New paid order ${o.number} from ${o.shipName} (${o.email}).\n${lines}\nTotal: ${money(o.totalMinor)}\nShip to: ${o.shipBuilding}, ${o.shipCity}, ${o.shipRegion}, ${o.shipCountry}\nAdmin: ${env.appUrl}/admin/orders/${o.id}`,
    });
  }
}
