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

export const metadata: Metadata = { title: "Simulated payment", robots: { index: false } };
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
    <div className="container-x max-w-xl py-12">
      <div className="rounded-2xl border-2 border-dashed border-rose bg-white p-6 sm:p-8">
        <p className="chip bg-cream px-3 py-1 text-charcoal">TEST PAYMENT</p>
        <h1 className="h-display mt-4 text-3xl">{METHOD[p.method] ?? "Payment"}</h1>
        <p className="mt-2 text-sm text-muted">Test mode: <strong>no money will be collected</strong> and no card details are requested.</p>
        <dl className="mt-6 space-y-2 rounded-xl bg-cream p-4 text-sm">
          <div className="flex justify-between"><dt>Order</dt><dd className="font-medium">{o.number}</dd></div>
          <div className="flex justify-between"><dt>Items</dt><dd>{o.items.reduce((a, i) => a + i.quantity, 0)}</dd></div>
          <div className="flex justify-between text-base"><dt>Amount</dt><dd className="font-semibold">{m(p.amountMinor)}</dd></div>
        </dl>
        <div className="mt-6 grid gap-3">
          {([["succeeded", "Pay now", "btn-primary w-full"], ["failed", "Simulate declined payment", "btn-secondary w-full"], ["cancelled", "Cancel payment", "btn-ghost w-full text-danger"]] as const).map(([outcome, label, cls]) => (
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
  );
}
