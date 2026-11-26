import type { Metadata } from "next";
import { ShopView } from "@/components/ShopView";
export const metadata: Metadata = { title: "Shop all" };
export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <ShopView searchParams={sp} title={sp.q ? "Search results" : "Shop all"} />;
}
