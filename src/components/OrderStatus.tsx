import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders";

const ORDER_CLS: Record<string, string> = {
  PENDING_PAYMENT: "bg-cream text-warn", CONFIRMED: "bg-ok/10 text-ok", PROCESSING: "bg-ok/10 text-ok",
  SHIPPED: "bg-charcoal text-ivory", DELIVERED: "bg-ok text-white", CANCELLED: "bg-danger/10 text-danger",
};
const PAY_CLS: Record<string, string> = {
  PENDING: "bg-cream text-warn", PAID: "bg-ok/10 text-ok", FAILED: "bg-danger/10 text-danger", CANCELLED: "bg-sand text-muted", REFUNDED: "bg-rose-soft text-rose-deep",
};
export const OrderBadge = ({ s }: { s: string }) => <span className={`chip ${ORDER_CLS[s] ?? ""}`}>{ORDER_STATUS_LABEL[s] ?? s}</span>;
export const PaymentBadge = ({ s }: { s: string }) => <span className={`chip ${PAY_CLS[s] ?? ""}`}>Payment: {PAYMENT_STATUS_LABEL[s] ?? s}</span>;
