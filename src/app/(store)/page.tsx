import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { listCategories, listProducts } from "@/lib/catalog";
import { currentCurrency } from "@/lib/currency";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { ProductCard } from "@/components/ProductCard";
import { ProductCarousel } from "@/components/ProductCarousel";
import { Stars } from "@/components/Stars";

export default async function Home() {
  const [{ t, locale }, cats, all, currency, s] = await Promise.all([getT(), listCategories(), listProducts({ sort: "featured" }), currentCurrency(), getSettings()]);
  const reviews = await db.select({ r: schema.reviews, product: schema.products.name }).from(schema.reviews)
    .innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId))
    .where(eq(schema.reviews.status, "APPROVED")).orderBy(desc(schema.reviews.createdAt)).limit(6);
  const card = (p: (typeof all)[number], i: number) => <ProductCard key={p.id} p={p} currency={currency} locale={locale} priority={i < 2} />;
  const tab = (key: string, label: string, slugs: string[]) => ({ key, label, content: all.filter((p) => slugs.includes(p.categorySlug)).map(card) });
  const counts = Object.fromEntries(cats.map((c) => [c.slug, all.filter((p) => p.categorySlug === c.slug).length]));
  const aeFree = s.deliveryZones.filter((z) => z.enabled && z.country === "AE" && z.freeOverFils).map((z) => z.freeOverFils!);
  const discovery = all.find((p) => p.slug === "discovery-set-5-x-8-ml");

  return (
    <>
      {/* Hero */}
      <section className="container-x pt-12 text-center sm:pt-20">
        <h1 className="mx-auto max-w-4xl font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-charcoal sm:text-6xl lg:text-[4.6rem]">
          Signature scents.<br /><span className="text-rose">Salon-perfect nails.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-muted sm:text-base">{t("home.hero.sub")}</p>
        <Link href="/shop" className="btn-primary mt-8 px-7 py-3.5 text-[15px]">{t("home.hero.cta")} <span aria-hidden="true" className="rtl:rotate-180">→</span></Link>

        <div className="relative mx-auto mt-24 max-w-5xl sm:mt-28">
          <div className="relative h-[230px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1B2338] via-navy to-[#0B101C] shadow-2xl sm:h-[300px]">
            <svg viewBox="0 0 1000 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <ellipse cx="500" cy="165" rx="400" ry="95" fill="none" stroke="#B86633" strokeOpacity=".55" strokeWidth="1.3" />
              <line x1="30" y1="165" x2="100" y2="165" stroke="#B86633" strokeOpacity=".5" /><line x1="900" y1="165" x2="970" y2="165" stroke="#B86633" strokeOpacity=".5" />
              <circle cx="100" cy="165" r="5" fill="#B86633" /><circle cx="900" cy="165" r="5" fill="#B86633" />
              <circle cx="500" cy="165" r="150" fill="url(#g)" /><defs><radialGradient id="g"><stop offset="0" stopColor="#B86633" stopOpacity=".25" /><stop offset="1" stopColor="#B86633" stopOpacity="0" /></radialGradient></defs>
            </svg>
            <div className="absolute bottom-6 start-7 hidden text-start md:block">
              <p className="font-display text-sm font-semibold text-white">Long-lasting EDP</p><p className="text-xs text-white/60">6-11 hours wear</p>
            </div>
            <div className="absolute bottom-6 end-7 hidden text-end md:block">
              <p className="font-display text-sm font-semibold text-white">{aeFree.length ? `Free over AED ${Math.min(...aeFree) / 100}` : "Fast delivery"}</p><p className="text-xs text-white/60">1-2 days in Dubai</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center gap-3 sm:-top-14 sm:gap-5">
            {["nude-almond-gloss-press-on-nails", "rose-oud-noir-eau-de-parfum", "pearl-drop-huggie-earrings"].map((slug, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={slug} src={`/products/${slug}-1.svg`} alt="" className={`rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 ${i === 1 ? "h-[240px] w-[192px] sm:h-[320px] sm:w-[256px]" : "mt-10 hidden h-[200px] w-[160px] rotate-[-6deg] sm:block sm:h-[250px] sm:w-[200px]"} ${i === 2 ? "rotate-[6deg]" : ""}`} />
            ))}
          </div>
        </div>
      </section>

      <ProductCarousel title={<>Customer<br />favourites</>} tabs={[
        tab("perfumes", t("nav.perfumes"), ["perfumes"]),
        tab("nails", "Nails", ["press-on-nails", "nail-care"]),
        tab("jewellery", t("nav.jewellery"), ["jewellery"]),
        tab("accessories", t("nav.accessories"), ["hair-accessories", "fashion-accessories"]),
      ].filter((x) => x.content.length)} />

      {/* Categories */}
      <section className="container-x py-6 sm:py-10" aria-labelledby="cats">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 id="cats" className="section-title">Shop by<br className="hidden sm:block" /> category</h2>
            <p className="mt-3 text-sm text-muted">Fragrance, nails and finishing touches - curated in Dubai.</p></div>
          <Link href="/shop" className="text-sm font-semibold text-charcoal hover:text-rose">View all products <span aria-hidden="true" className="rtl:rotate-180">→</span></Link>
        </div>
        <ul className="mt-8 grid gap-3 border-t-2 border-charcoal pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group flex items-center gap-4 rounded-2xl border border-sand bg-white p-3 transition hover:border-charcoal/30 hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image && <img src={c.image} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                <span className="flex-1"><span className="block font-display font-semibold text-charcoal">{locale === "ar" && c.nameAr ? c.nameAr : c.name}</span><span className="text-xs text-muted">{counts[c.slug] ?? 0} products</span></span>
                <span className="grid h-9 w-9 place-items-center rounded-full border border-sand text-charcoal transition group-hover:border-charcoal group-hover:bg-charcoal group-hover:text-white" aria-hidden="true"><span className="rtl:rotate-180">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Promo */}
      {discovery && (
        <section className="container-x py-14 sm:py-20">
          <div className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-rose p-7 text-white sm:p-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">Find your signature.<br />Try all five scents.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/85">The 21mine Discovery Set brings every eau de parfum in 8 ml travel sprays, packed in a magnetic gift box - the easiest way to choose your full-size bottle.</p>
              <Link href={`/product/${discovery.slug}`} className="btn mt-7 bg-charcoal text-white hover:bg-navy">Shop the discovery set <span aria-hidden="true" className="rtl:rotate-180">→</span></Link>
            </div>
            <div className="flex justify-center gap-3">
              {["discovery-set-5-x-8-ml-1", "amber-musk-velvet-eau-de-parfum-1", "white-jasmine-silk-eau-de-parfum-1"].map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img} src={`/products/${img}.svg`} alt="" className={`w-[30%] max-w-[150px] rounded-2xl object-cover shadow-xl ring-4 ring-white/15 ${i === 1 ? "-translate-y-3" : "translate-y-3"}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews (only real, approved, verified-purchase reviews) */}
      {reviews.length > 0 && (
        <section className="container-x py-10" aria-labelledby="rev">
          <h2 id="rev" className="section-title">Loved by our customers</h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.map(({ r, product }) => (
              <li key={r.id} className="card p-5">
                <div className="flex items-center justify-between"><Stars value={r.rating} size={15} /><span className="text-xs font-medium text-ok">✓ Verified purchase</span></div>
                <p className="mt-3 font-medium text-charcoal">{r.title}</p>
                <p className="mt-1 line-clamp-4 text-sm leading-6 text-muted">{r.body}</p>
                <p className="mt-3 text-xs text-faint">{r.displayName} · {product}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Trust band */}
      <section className="mt-10 bg-navy text-white">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr] lg:py-20">
          <div>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem]">Curated.<br />Checked.<br />Delivered.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">Every order is checked and packed in Dubai, with clear ingredient, material and care information on every product.</p>
            <Link href="/policies/shipping" className="btn mt-7 bg-rose text-white hover:bg-rose-deep">Delivery details <span aria-hidden="true" className="rtl:rotate-180">→</span></Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
            {[
              ["Long-lasting fragrance", "Eau de parfum concentrations of 16-20% with notes listed for every scent."],
              ["Salon-quality nails", "24 nails in 12 sizes, glue and tabs included - reusable with care."],
              ["Fast UAE delivery", "1-2 days in Dubai, Sharjah and Ajman; tracked shipping to the GCC and worldwide."],
              ["Shop in your currency", "AED, USD, EUR, GBP, SAR and more - the total you see is the total you pay."],
            ].map(([h, b]) => <li key={h} className="bg-navy p-6"><p className="font-display font-semibold">{h}</p><p className="mt-2 text-sm leading-6 text-white/65">{b}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="container-x grid gap-6 py-16 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="font-display text-2xl font-semibold leading-tight text-charcoal/80 sm:text-3xl">Perfume, press-on nails &amp; accessories in Dubai and across the UAE</h2>
        <div className="space-y-4 text-sm leading-7 text-muted">
          <p>21mine brings together long-lasting eaux de parfum inspired by Arabian rose, oud, amber and musk, salon-quality reusable press-on nails, nail care essentials and tarnish-resistant jewellery and accessories.</p>
          <p>Orders are delivered within 1-2 days across Dubai, Sharjah and Ajman and within 2-3 days to Abu Dhabi and the northern emirates, with tracked shipping to the GCC and worldwide. See <Link href="/policies/shipping" className="link">delivery & shipping</Link> and <Link href="/policies/returns" className="link">returns</Link> for details.</p>
        </div>
      </section>
    </>
  );
}
