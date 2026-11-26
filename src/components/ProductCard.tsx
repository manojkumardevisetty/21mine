import Link from "next/link";
import type { ProductListItem } from "@/lib/catalog";
import type { CurrencyInfo } from "@/lib/money";
import { Price } from "./Price";
import { Stars } from "./Stars";

export function ProductCard({ p, currency, locale = "en", priority = false }: { p: ProductListItem; currency: CurrencyInfo; locale?: string; priority?: boolean }) {
  const out = p.stock <= 0;
  return (
    <article className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream">
          {p.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          )}
          {p.hoverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.hoverImage} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute start-3 top-3 flex flex-col gap-1">
            {out && <span className="chip bg-charcoal text-ivory">Out of stock</span>}
            {!out && p.stock <= 5 && <span className="chip bg-white text-warn">Low stock</span>}
            {p.compareAtFils && p.compareAtFils > p.minPriceFils && <span className="chip bg-rose text-white">Sale</span>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted">{p.categoryName}</p>
          <h3 className="font-display text-xl leading-snug">{p.name}</h3>
          {p.reviewCount > 0 && p.rating && (
            <p className="flex items-center gap-1.5 text-xs text-muted"><Stars value={p.rating} size={13} /> ({p.reviewCount})</p>
          )}
          <p className="text-sm">
            {p.variantCount > 1 && <span className="text-muted">From </span>}
            <Price fils={p.minPriceFils} currency={currency} compareAtFils={p.compareAtFils} locale={locale} />
          </p>
        </div>
      </Link>
    </article>
  );
}
