import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductReviews, listProducts } from "@/lib/catalog";
import { currentCurrency } from "@/lib/currency";
import { getT } from "@/lib/i18n";
import { convertFils, formatMinor } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { countryName } from "@/lib/countries";
import { getUser } from "@/lib/authz";
import { userReview, verifiedPurchase } from "@/lib/reviews";
import { Gallery } from "@/components/Gallery";
import { AddToBag } from "@/components/AddToBag";
import { Stars } from "@/components/Stars";
import { ReviewForm } from "@/components/ReviewForm";
import { ProductCard } from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return { title: p.name, description: p.shortDescription, openGraph: { images: p.images[0] ? [p.images[0].url] : [] } };
}

const KIND_LABEL: Record<string, string> = {
  PERFUME: "Fragrance details", PRESS_ON_NAILS: "Nail set details", NAIL_ACCESSORY: "Product details", FASHION_ACCESSORY: "Product details",
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const [{ t, locale }, currency, s, reviews, user, related] = await Promise.all([
    getT(), currentCurrency(), getSettings(), getProductReviews(p.id), getUser(),
    listProducts({ category: p.category.slug }),
  ]);
  const canReview = user ? await verifiedPurchase(user.id, p.id) : null;
  const mine = user && canReview ? await userReview(user.id, p.id) : null;
  const fmt = (fils: number) => formatMinor(convertFils(fils, currency), currency.code, currency.exponent, locale);
  const zones = s.deliveryZones.filter((z) => z.enabled);
  const ae = zones.filter((z) => z.country === "AE");
  const aeMin = ae.length ? Math.min(...ae.map((z) => z.feeFils)) : null;
  const aeFree = ae.find((z) => z.freeOverFils)?.freeOverFils ?? null;
  const intl = zones.filter((z) => z.country !== "AE");
  const totalStock = p.variants.reduce((a, v) => a + v.stock, 0);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.shortDescription,
    image: p.images.map((i) => i.url), sku: p.variants[0].sku, brand: { "@type": "Brand", name: "21mine" },
    offers: p.variants.map((v) => ({ "@type": "Offer", sku: v.sku, priceCurrency: "AED", price: (v.priceFils / 100).toFixed(2),
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" })),
    ...(reviews.count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.avg.toFixed(1), reviewCount: reviews.count } } : {}),
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <Link href="/" className="hover:underline">Home</Link> / <Link href={`/category/${p.category.slug}`} className="hover:underline">{p.category.name}</Link> / <span aria-current="page">{p.name}</span>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} />
        <div>
          <p className="text-xs uppercase tracking-widest text-rose-deep">{p.category.name}</p>
          <h1 className="h-display mt-2 text-4xl sm:text-5xl">{locale === "ar" && p.nameAr ? p.nameAr : p.name}</h1>
          {reviews.count > 0 ? (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-muted"><Stars value={reviews.avg} /> {reviews.avg.toFixed(1)} · {reviews.count} review{reviews.count > 1 ? "s" : ""}</a>
          ) : (
            <a href="#reviews" className="mt-2 inline-block text-sm text-muted">No reviews yet</a>
          )}
          <p className="mt-4 text-lg text-muted">{p.shortDescription}</p>
          <div className="mt-6">
            <AddToBag
              labels={{ add: t("common.addToBag"), out: t("common.outOfStock"), viewBag: t("common.viewBag") }}
              variants={p.variants.map((v) => ({ id: v.id, name: v.name, options: v.options, stock: v.stock, price: fmt(v.priceFils), compareAt: v.compareAtFils && v.compareAtFils > v.priceFils ? fmt(v.compareAtFils) : null }))}
            />
          </div>
          {currency.code !== "AED" && <p className="mt-3 text-xs text-muted">Prices shown in {currency.code}, converted from AED. You'll be charged the {currency.code} amount shown at checkout.</p>}
          {p.highlights.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">{p.highlights.map((h) => <li key={h} className="chip bg-cream px-3 py-1 text-charcoal">{h}</li>)}</ul>
          )}

          <div className="mt-8 divide-y divide-sand border-y border-sand">
            <details className="group py-4" open>
              <summary className="flex cursor-pointer items-center justify-between font-medium">Description<span aria-hidden="true" className="group-open:rotate-45 transition">+</span></summary>
              <p className="mt-3 leading-7 text-muted">{p.description}</p>
            </details>
            <details className="group py-4" open>
              <summary className="flex cursor-pointer items-center justify-between font-medium">{KIND_LABEL[p.kind]}<span aria-hidden="true" className="group-open:rotate-45 transition">+</span></summary>
              <dl className="mt-3 grid grid-cols-[minmax(0,40%)_1fr] gap-x-4 gap-y-2 text-sm">
                {Object.entries(p.details).map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>))}
                <div className="contents"><dt className="text-muted">SKU</dt><dd>{p.variants.map((v) => v.sku).join(", ")}</dd></div>
              </dl>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between font-medium">Delivery & returns<span aria-hidden="true" className="group-open:rotate-45 transition">+</span></summary>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {aeMin !== null && <li>UAE: from {fmt(aeMin)} · {ae[0].etaDays} business days{aeFree ? ` · free over ${fmt(aeFree)}` : ""}</li>}
                {intl.length > 0 && <li>International: {Array.from(new Set(intl.map((z) => countryName(z.country)))).slice(0, 6).join(", ")}{intl.length > 6 ? " and more" : ""} - fees shown at checkout</li>}
                {p.kind === "PERFUME" && <li>Perfumes are flammable goods; some international destinations may be restricted by couriers.</li>}
                <li>Returns: unopened items within {s.returnWindowDays} days. {p.kind === "PERFUME" || p.kind === "PRESS_ON_NAILS" ? "Opened or used items can't be returned for hygiene reasons unless faulty." : ""} <Link href="/policies/returns" className="link">Returns policy</Link></li>
              </ul>
            </details>
            {p.careInfo && (
              <details className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium">Safety & care<span aria-hidden="true" className="group-open:rotate-45 transition">+</span></summary>
                <p className="mt-3 text-sm leading-6 text-muted">{p.careInfo}</p>
              </details>
            )}
          </div>
          {totalStock <= 0 && <p className="mt-4 text-sm text-muted">This product is currently sold out. Please check back soon or <Link href="/contact" className="link">contact us</Link>.</p>}
        </div>
      </div>

      <section id="reviews" className="mt-16 scroll-mt-28" aria-labelledby="rev-h">
        <h2 id="rev-h" className="h-display text-3xl">Reviews</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            {reviews.count === 0 ? (
              <p className="text-muted">There are no reviews for this product yet. Reviews can be written by customers who have purchased it.</p>
            ) : (
              <>
                <p className="flex items-center gap-2"><Stars value={reviews.avg} size={20} /> <span className="text-lg">{reviews.avg.toFixed(1)} out of 5</span> <span className="text-sm text-muted">({reviews.count} verified review{reviews.count > 1 ? "s" : ""})</span></p>
                <ul className="mt-6 space-y-6">
                  {reviews.list.map((r) => (
                    <li key={r.id} className="border-b border-sand pb-6">
                      <div className="flex items-center gap-2"><Stars value={r.rating} size={14} /><span className="font-medium">{r.title}</span></div>
                      <p className="mt-2 leading-7 text-muted">{r.body}</p>
                      <p className="mt-2 text-xs text-muted">{r.displayName} · Verified purchase · {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            {!user ? (
              <p className="card p-5 text-sm">Bought this product? <Link href={`/account/login?next=/product/${p.slug}%23reviews`} className="link">Sign in</Link> to write a review.</p>
            ) : canReview ? (
              <ReviewForm productId={p.id} defaultName={user.name.split(" ")[0]} existing={mine ? { rating: mine.rating, title: mine.title, body: mine.body, displayName: mine.displayName, status: mine.status } : null} />
            ) : (
              <p className="card p-5 text-sm text-muted">Reviews can be written once you've purchased this product.</p>
            )}
          </div>
        </div>
      </section>

      {related.filter((r) => r.id !== p.id).length > 0 && (
        <section className="mt-16" aria-labelledby="rel-h">
          <h2 id="rel-h" className="h-display text-3xl">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {related.filter((r) => r.id !== p.id).slice(0, 4).map((r) => <ProductCard key={r.id} p={r} currency={currency} locale={locale} />)}
          </div>
        </section>
      )}
    </div>
  );
}
