import { expireStaleOrders } from "@/lib/payments/apply";

export const runtime = "nodejs";

// Call every 10-15 minutes (e.g. Vercel Cron / system cron) with header: Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const n = await expireStaleOrders(60);
  return Response.json({ expired: n });
}
