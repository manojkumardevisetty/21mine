import Link from "next/link";
import { listCategories, listProducts } from "@/lib/catalog";
import { currentCurrency } from "@/lib/currency";
import { getT } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { getSettings } from "@/lib/settings";

export default async function Home() {
  const [{ t, locale }, cats, featured, currency, s] = await Promise.all([
    getT(), listCategories(), listProducts({ sort: "featured" }), currentCurrency(), getSettings(),
  ]);
  const picks = featured.filter((p) => p.isFeatured).slice(0, 8);
  return (
    <>
      <section className="relative overflow-hidden bg-cream">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-deep">21mine · Dubai</p>
            <h1 className="h-display mt-4 text-5xl leading-[1.05] sm:text-6xl">{t("home.hero.title")}</h1>
            <p className="mt-5 max-w-md text-lg text-muted">{t("home.hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary">{t("home.hero.cta")}</Link>
              <Link href="/category/perfumes" className="btn-secondary">{t("nav.perfumes")}</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/products/rose-oud-noir-eau-de-parfum-1.svg" alt="Rose Oud Noir Eau de Parfum" className="h-full w-full rounded-3xl object-cover" />
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/products/nude-almond-gloss-press-on-nails-1.svg" alt="Nude Almond Gloss press-on nails" className="aspect-square w-full rounded-3xl object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/products/pearl-drop-huggie-earrings-1.svg" alt="Pearl Drop Huggie Earrings" className="aspect-square w-full rounded-3xl object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-16" aria-labelledby="cats">
        <h2 id="cats" className="h-display text-3xl sm:text-4xl">{t("home.categories")}</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-2xl bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image && <img src={c.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 font-display text-lg">{locale === "ar" && c.nameAr ? c.nameAr : c.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-x pb-8" aria-labelledby="feat">
        <div className="flex items-end justify-between">
          <h2 id="feat" className="h-display text-3xl sm:text-4xl">{t("home.featured")}</h2>
          <Link href="/shop" className="link text-sm">{t("nav.shop")}</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {picks.map((p, i) => <ProductCard key={p.id} p={p} currency={currency} locale={locale} priority={i < 4} />)}
        </div>
      </section>

      <section className="container-x mt-16 grid gap-6 rounded-3xl bg-charcoal p-8 text-ivory sm:grid-cols-3 sm:p-12">
        {[
          ["Delivered from Dubai", `Fast delivery across all seven emirates${s.deliveryZones.some((z) => z.enabled && z.country !== "AE") ? ", plus GCC and worldwide shipping" : ""}.`],
          ["Pay your way", "Shop in AED or your local currency - the total you see at checkout is the total you pay."],
          ["Easy returns", `Unopened items can be returned within ${s.returnWindowDays} days. Faulty items are always replaced or refunded.`],
        ].map(([h, b]) => (
          <div key={h}><h3 className="font-display text-2xl">{h}</h3><p className="mt-2 text-sm text-ivory/75">{b}</p></div>
        ))}
      </section>
    </>
  );
}
