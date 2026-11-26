import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import { getCategory } from "@/lib/catalog";
import { getLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return c ? { title: c.name, description: c.description } : {};
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) notFound();
  const locale = await getLocale();
  return <ShopView searchParams={await searchParams} fixedCategory={slug} title={locale === "ar" && c.nameAr ? c.nameAr : c.name} intro={c.description} />;
}
