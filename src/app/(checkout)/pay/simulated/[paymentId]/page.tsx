import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/authz";
import { canViewOrder } from "@/lib/orders";
import { formatMinor } from "@/lib/money";
import { simulatePaymentAction } from "@/app/actions/payment";
import { SubmitButton } from "@/components/SubmitButton";
import { createOrderToken } from "@/lib/tokens";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PaymentPills } from "@/components/PaymentPills";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false } };
export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { credit_card: "Credit card", debit_card: "Debit card", apple_pay: "Apple Pay", google_pay: "Google Pay" };

export default async function SimulatedPay({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { paymentId } = await params;
  const { t } = await searchParams;
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId), with: { order: { with: { items: true } } } });
  if (!p || p.provider !== "simulated") notFound();
  if (!canViewOrder(p.order, await getUser(), t)) notFound();
  if (p.status !== "PENDING") redirect(`/orders/${p.order.number}?t=${createOrderToken(p.orderId)}`);
  const o = p.order;
  const m = (v: number) => formatMinor(v, o.currency, o.currencyExponent);
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-14">
      <Link href="/" aria-label="21mine home" className="flex justify-center"><Logo /></Link>
      <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-sand px-5 py-4 sm:px-7">
          <span className="flex items-center gap-2 text-sm font-medium text-charcoal"><span aria-hidden="true">🔒</span> Secure payment</span>
          <span className="chip bg-rose-soft px-2.5 py-0.5 text-[11px] font-semibold text-rose-deep">TEST PAYMENT</span>
        </div>
        <div className="px-5 py-6 sm:px-7">
          <h1 className="font-display text-2xl font-semibold text-charcoal">{METHOD[p.method] ?? "Payment"}</h1>
          <p className="mt-1 text-sm text-muted">Test mode: no money will be collected and no card details are requested.</p>
          <dl className="mt-6 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Order</dt><dd className="font-medium text-charcoal">{o.number}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="text-charcoal">{o.items.reduce((a, i) => a + i.quantity, 0)}</dd></div>
            <div className="flex items-baseline justify-between border-t-2 border-charcoal pt-4"><dt className="font-display text-lg font-semibold text-charcoal">Amount</dt><dd className="font-display text-2xl font-bold text-charcoal">{m(p.amountMinor)}</dd></div>
          </dl>
          <div className="mt-7 grid gap-3">
            {([["succeeded", `Pay ${m(p.amountMinor)}`, "btn w-full bg-rose py-4 text-white hover:bg-rose-deep"], ["failed", "Simulate declined payment", "btn-secondary w-full"], ["cancelled", "Cancel payment", "btn-ghost w-full text-danger"]] as const).map(([outcome, label, cls]) => (
              <form key={outcome} action={simulatePaymentAction}>
                <input type="hidden" name="paymentId" value={p.id} />
                <input type="hidden" name="t" value={t ?? ""} />
                <input type="hidden" name="outcome" value={outcome} />
                <SubmitButton className={cls} pendingText="Processing…">{label}</SubmitButton>
              </form>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-center"><PaymentPills /></div>
    </div>
  );
}
