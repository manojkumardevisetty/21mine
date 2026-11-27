import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getUser } from "@/lib/authz";
import { canViewOrder } from "@/lib/orders";
import { createOrderToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };
export const dynamic = "force-dynamic";

// Customers land here after the live gateway's hosted page. The order is only marked paid
// when the gateway's signed webhook arrives - never from this redirect.
export default async function PayReturn({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ t?: string; cancelled?: string; n?: string }> }) {
  const { paymentId } = await params;
  const sp = await searchParams;
  const p = await db.query.payments.findFirst({ where: eq(schema.payments.id, paymentId), with: { order: true } });
  if (!p || !canViewOrder(p.order, await getUser(), sp.t)) notFound();
  const n = Number(sp.n ?? 0);
  if (p.status !== "PENDING" || sp.cancelled || n >= 20) redirect(`/orders/${p.order.number}?t=${createOrderToken(p.orderId)}&from=payment`);
  return (
    <div className="container-x max-w-lg py-20 text-center">
      <meta httpEquiv="refresh" content={`3;url=/pay/return/${p.id}?t=${encodeURIComponent(sp.t ?? "")}&n=${n + 1}`} />
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-charcoal border-t-transparent" aria-hidden="true" />
      <h1 className="h-display mt-6 text-3xl">Confirming your payment…</h1>
      <p className="mt-2 text-muted" role="status">Please don't close this page. This usually takes a few seconds.</p>
    </div>
  );
}
