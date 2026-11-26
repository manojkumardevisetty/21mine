import type { Metadata } from "next";
import Link from "next/link";
import { loadCart, readCartId } from "@/lib/cart";
import { currentCurrency } from "@/lib/currency";
import { formatMinor } from "@/lib/money";
import { quoteCart } from "@/lib/checkout";
import { CartLineControls } from "@/components/CartLineControls";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [cart, currency] = await Promise.all([loadCart(await readCartId()), currentCurrency()]);
  if (cart.lines.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="h-display text-4xl">Your bag is empty</h1>
        <p className="mt-3 text-muted">Discover our perfumes, press-on nails and accessories.</p>
        <Link href="/shop" className="btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }
  const q = await quoteCart({ lines: cart.lines.map((l) => ({ variantId: l.variantId, unitPriceFils: l.unitPriceFils, quantity: l.quantity })), currencyCode: currency.code });
  const money = (m: number) => formatMinor(m, q.currency, q.exponent);
  const blocked = cart.lines.some((l) => l.problem);
  return (
    <div className="container-x py-10">
      <h1 className="h-display text-4xl">Your bag</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-sand border-y border-sand">
          {cart.lines.map((l, i) => (
            <li key={l.id} className="flex gap-4 py-5">
              <Link href={`/product/${l.productSlug}`} className="w-24 shrink-0 overflow-hidden rounded-xl bg-cream sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image && <img src={l.image} alt={l.imageAlt} className="aspect-[4/5] w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link href={`/product/${l.productSlug}`} className="font-display text-xl hover:underline">{l.productName}</Link>
                    <p className="text-sm text-muted">{l.variantName} · {l.sku}</p>
                  </div>
                  <p className="text-sm font-medium">{money(q.lines[i].lineMinor)}</p>
                </div>
                <p className="text-xs text-muted">{money(q.lines[i].unitMinor)} each</p>
                {l.problem === "unavailable" && <p className="text-sm text-danger" role="alert">No longer available - please remove it.</p>}
                {l.problem === "out_of_stock" && <p className="text-sm text-danger" role="alert">Out of stock - please remove it.</p>}
                {l.problem === "insufficient" && <p className="text-sm text-danger" role="alert">Only {l.stock} left - please reduce the quantity.</p>}
                <div className="mt-auto"><CartLineControls itemId={l.id} quantity={l.quantity} max={l.available ? l.stock : 0} name={l.productName} /></div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit space-y-4 p-6" aria-labelledby="sum-h">
          <h2 id="sum-h" className="font-display text-2xl">Order summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal ({cart.count} item{cart.count > 1 ? "s" : ""})</dt><dd>{money(q.subtotalMinor)}</dd></div>
            <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>Calculated at checkout</dd></div>
          </dl>
          <p className="text-xs text-muted">Delivery fees depend on your address and are shown before you pay. Discount codes can be applied at checkout.</p>
          {blocked ? (
            <p className="text-sm text-danger" role="alert">Please fix the items marked above to continue.</p>
          ) : (
            <Link href="/checkout" className="btn-primary w-full">Checkout</Link>
          )}
          <Link href="/shop" className="btn-ghost w-full">Continue shopping</Link>
          {currency.code !== "AED" && <p className="text-xs text-muted">Prices shown in {currency.code}. You can change currency at the top of the page.</p>}
        </aside>
      </div>
    </div>
  );
}
