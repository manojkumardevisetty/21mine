import { getProviderById } from "@/lib/payments";
import { applyPaymentEvent } from "@/lib/payments/apply";

export const runtime = "nodejs";

// Live gateways post signed events here: /api/payments/webhook/<provider-id>
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = getProviderById(id);
  if (!provider || provider.simulated || !provider.verifyWebhook) return new Response("Unknown provider", { status: 404 });
  const raw = await req.text();
  const event = await provider.verifyWebhook(raw, req.headers);
  if (!event) return new Response("Invalid signature or unsupported event", { status: 400 });
  const res = await applyPaymentEvent(event, `webhook:${id}`);
  if (!res.ok) {
    console.error("[webhook] rejected", id, event.providerEventId, res.error);
    // 200 for business rejections (mismatch) so the gateway doesn't retry forever; logged on the order.
    return Response.json({ received: true, applied: false, error: res.error });
  }
  return Response.json({ received: true, outcome: res.outcome });
}
