import Link from "next/link";
import { listCategories, listProducts, type ProductFilters } from "@/lib/catalog";
import { currentCurrency } from "@/lib/currency";
import { getT } from "@/lib/i18n";
import { parseMajor, toBaseFils } from "@/lib/money";
import { ProductCard } from "./ProductCard";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function ShopView({ searchParams, fixedCategory, title, intro }: {
  searchParams: SP; fixedCategory?: string; title: string; intro?: string;
}) {
  const [{ locale }, currency, cats] = await Promise.all([getT(), currentCurrency(), listCategories()]);
  const q = one(searchParams.q).trim().slice(0, 80);
  const category = fixedCategory ?? one(searchParams.category);
  const minRaw = one(searchParams.min), maxRaw = one(searchParams.max);
  const min = minRaw ? parseMajor(minRaw, currency.exponent) : null;
  const max = maxRaw ? parseMajor(maxRaw, currency.exponent) : null;
  const inStock = one(searchParams.stock) === "1";
  const sortRaw = one(searchParams.sort);
  const sort = (["featured", "price_asc", "price_desc", "newest", "name"].includes(sortRaw) ? sortRaw : "featured") as ProductFilters["sort"];
  const priceError = (minRaw && min === null) || (maxRaw && max === null) ? "Enter prices as numbers, e.g. 50 or 120.50" :
    min !== null && max !== null && min > max ? "Minimum price must be less than maximum price" : null;

  const products = await listProducts({
    category: category || undefined, q: q || undefined, inStock, sort,
    minFils: !priceError && min !== null ? toBaseFils(min, currency) : undefined,
    maxFils: !priceError && max !== null ? toBaseFils(max, currency) : undefined,
  });
  const active = Boolean(q || (!fixedCategory && category) || minRaw || maxRaw || inStock);
  const autoFocus = one(searchParams.focus) === "search";

  const filters = (
    <form method="get" className="space-y-5" role="search" aria-label="Filter products">
      <div>
        <label htmlFor="q" className="label">Search</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Perfume, nails, earrings…" className="input" autoFocus={autoFocus} />
      </div>
      {!fixedCategory && (
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={category} className="input">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      )}
      <fieldset>
        <legend className="label">Price ({currency.code})</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="min">Minimum price</label>
          <input id="min" name="min" inputMode="decimal" defaultValue={minRaw} placeholder="Min" className="input" aria-invalid={priceError ? true : undefined} aria-describedby={priceError ? "price-err" : undefined} />
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="max">Maximum price</label>
          <input id="max" name="max" inputMode="decimal" defaultValue={maxRaw} placeholder="Max" className="input" aria-invalid={priceError ? true : undefined} />
        </div>
        {priceError && <p id="price-err" className="field-error" role="alert">{priceError}</p>}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="h-4 w-4 accent-[#2B2B2B]" /> In stock only
      </label>
      <div>
        <label htmlFor="sort" className="label">Sort by</label>
        <select id="sort" name="sort" defaultValue={sort} className="input">
          <option value="featured">Featured</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">Apply</button>
        {active && <Link href={fixedCategory ? `/category/${fixedCategory}` : "/shop"} className="btn-secondary">Clear</Link>}
      </div>
    </form>
  );

  return (
    <div className="container-x py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted"><Link href="/" className="hover:underline">Home</Link> / <span aria-current="page">{title}</span></nav>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}
      {fixedCategory && (
        <ul className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Categories">
          {cats.map((c) => (
            <li key={c.slug}><Link href={`/category/${c.slug}`} aria-current={c.slug === fixedCategory ? "page" : undefined}
              className={`chip whitespace-nowrap border px-3 py-1.5 text-sm ${c.slug === fixedCategory ? "border-charcoal bg-charcoal text-ivory" : "border-sand hover:border-charcoal"}`}>{c.name}</Link></li>
          ))}
        </ul>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0">
          <details className="card p-4 lg:hidden" open={active || autoFocus}>
            <summary className="cursor-pointer font-medium">Filter & sort</summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="hidden lg:block lg:sticky lg:top-32">{filters}</div>
        </aside>
        <section aria-live="polite" className="min-w-0">
          <p className="mb-4 text-sm text-muted">{products.length} {products.length === 1 ? "product" : "products"}{q ? ` for “${q}”` : ""}</p>
          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <h2 className="font-display text-2xl">No products match your filters</h2>
              <p className="mt-2 text-sm text-muted">Try a different search term, widen the price range or clear the filters.</p>
              <Link href={fixedCategory ? `/category/${fixedCategory}` : "/shop"} className="btn-secondary mt-5">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} p={p} currency={currency} locale={locale} priority={i < 3} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
