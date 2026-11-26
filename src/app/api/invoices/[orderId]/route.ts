import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { canViewOrder, invoiceEligible } from "@/lib/orders";
import { renderInvoicePdf } from "@/lib/invoice";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const session = await auth();
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  const viewer = session?.user ? { id: session.user.id, role: session.user.role } : null;
  if (!o || !canViewOrder(o, viewer, token)) return new Response("Not found", { status: 404 });
  if (!invoiceEligible(o)) return new Response("Invoice is available once payment is confirmed.", { status: 409 });
  const pdf = await renderInvoicePdf(o);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="21mine-${o.invoiceNumber ?? o.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
