import type { Metadata } from "next";
import { requireUser } from "@/lib/authz";
import { ordersForUser } from "@/lib/account";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderList } from "@/components/account/OrderList";

export const metadata: Metadata = { title: "Order history", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Orders() {
  const user = await requireUser("/account/orders");
  return <AccountShell title="Order history" active="/account/orders"><OrderList orders={await ordersForUser(user.id)} /></AccountShell>;
}
