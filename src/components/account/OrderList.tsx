import Link from "next/link";
import { formatMinor } from "@/lib/money";
import { invoiceEligible } from "@/lib/orders";
import { OrderBadge, PaymentBadge } from "../OrderStatus";

type O = { id: string; number: string; createdAt: Date; totalMinor: number; currency: string; currencyExponent: number; status: string; paymentStatus: string; itemCount: number };

export function OrderList({ orders }: { orders: O[] }) {
  if (!orders.length) return (
    <div className="card p-8 text-center"><p className="font-display text-2xl">No orders yet</p><p className="mt-2 text-sm text-muted">When you place an order it will appear here.</p><Link href="/shop" className="btn-primary mt-5">Start shopping</Link></div>
  );
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <Link href={`/orders/${o.number}`} className="font-medium hover:underline">{o.number}</Link>
            <p className="text-xs text-muted">{o.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })} · {o.itemCount} item{o.itemCount !== 1 ? "s" : ""} · {formatMinor(o.totalMinor, o.currency, o.currencyExponent)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderBadge s={o.status} /><PaymentBadge s={o.paymentStatus} />
            {invoiceEligible(o) && <a href={`/api/invoices/${o.id}`} className="btn-ghost btn-sm" download>Invoice PDF</a>}
            <Link href={`/orders/${o.number}`} className="btn-secondary btn-sm">View</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
