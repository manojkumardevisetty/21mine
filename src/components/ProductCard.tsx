import Link from "next/link";
import type { ProductListItem } from "@/lib/catalog";
import { convertFils, formatMinor, type CurrencyInfo } from "@/lib/money";

export function ProductCard({ p, currency, locale = "en", priority = false }: { p: ProductListItem; currency: CurrencyInfo; locale?: string; priority?: boolean }) {
  const out = p.stock <= 0;
  const fmt = (f: number) => formatMinor(convertFils(f, currency), currency.code, currency.exponent, locale);
  const pct = p.compareAtFils && p.compareAtFils > p.minPriceFils ? Math.round((1 - p.minPriceFils / p.compareAtFils) * 100) : 0;
  const sizeLine = p.variantCount > 1 && p.sizes.length <= 34 ? p.sizes : p.variantCount > 1 ? `${p.variantCount} options` : p.sizes;
  return (
    <article className="group relative h-full">
      <Link href={`/product/${p.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-sand/70 bg-cream">
          {p.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          )}
          <div className="absolute start-3 top-3 flex flex-col items-start gap-1">
            {out && <span className="chip bg-charcoal text-white">Sold out</span>}
            {!out && p.stock <= 5 && <span className="chip bg-white text-warn shadow-sm">Low stock</span>}
            {pct > 0 && <span className="chip bg-rose text-white">−{pct}%</span>}
          </div>
        </div>
        <h3 className="mt-3.5 font-display text-[15px] font-semibold leading-snug text-charcoal sm:text-base">{p.name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
          <span>{sizeLine}</span>
          {p.reviewCount > 0 && p.rating && <span className="flex items-center gap-0.5"><span className="text-gold" aria-hidden="true">★</span><span className="font-medium text-charcoal">{p.rating.toFixed(1)}</span> ({p.reviewCount})</span>}
        </p>
        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 border-t border-sand pt-3 text-sm">
            {p.variantCount > 1 && <span className="text-xs text-muted">From</span>}
            {pct > 0 && <s className="text-xs text-faint">{fmt(p.compareAtFils!)}</s>}
            <span className="font-bold text-charcoal">{fmt(p.minPriceFils)}</span>
            {pct > 0 && <span className="text-xs font-semibold text-ok">−{pct}%</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
