"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCartView, type CartView } from "@/app/actions/cartView";
import { updateCartItemAction } from "@/app/actions/cart";

type Added = { name: string; variant: string; image: string | null } | null;
type Ctx = { open: () => void; close: () => void; showAdded: (a: Added) => void; count: number; refresh: () => void };
const CartCtx = createContext<Ctx>({ open: () => {}, close: () => {}, showAdded: () => {}, count: 0, refresh: () => {} });
export const useCart = () => useContext(CartCtx);

export function CartProvider({ initialCount, children }: { initialCount: number; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [added, setAdded] = useState<Added>(null);
  const [view, setView] = useState<CartView | null>(null);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const router = useRouter();

  const refresh = useCallback(() => {
    start(async () => { const v = await getCartView(); setView(v); setCount(v.count); });
  }, []);
  useEffect(() => setCount(initialCount), [initialCount]);
  useEffect(() => { if (isOpen || added) refresh(); }, [isOpen, added, refresh]);
  useEffect(() => {
    if (!isOpen && !added) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setAdded(null); } };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [isOpen, added]);

  const setQty = (itemId: string, quantity: number) => {
    start(async () => {
      const fd = new FormData(); fd.set("itemId", itemId); fd.set("quantity", String(quantity));
      await updateCartItemAction(null, fd);
      const v = await getCartView(); setView(v); setCount(v.count); router.refresh();
    });
  };

  return (
    <CartCtx.Provider value={{ open: () => { setAdded(null); setOpen(true); }, close: () => setOpen(false), showAdded: setAdded, count, refresh }}>
      {children}

      {added && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-charcoal/40 p-4 animate-fade-in" onClick={() => setAdded(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="added-title" className="w-full min-w-0 max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 border-b border-sand p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-rose/40 text-rose" aria-hidden="true">✓</span>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {added.image && <img src={added.image} alt="" className="h-11 w-11 rounded-lg object-cover" />}
                <div className="min-w-0"><p id="added-title" className="text-xs text-muted">Added to your cart</p><p className="break-words font-display font-semibold leading-snug text-charcoal">{added.name}</p><p className="text-xs text-muted">{added.variant}</p></div>
              </div>
              <button className="btn-icon h-9 w-9 shrink-0" onClick={() => setAdded(null)} aria-label="Close" autoFocus>✕</button>
            </div>
            {view && view.suggestions.length > 0 && (
              <div className="p-5">
                <p className="mb-3 text-sm font-medium text-charcoal">Pairs well with</p>
                <ul className="no-scrollbar flex gap-3 overflow-x-auto">
                  {view.suggestions.map((s) => (
                    <li key={s.slug} className="w-36 shrink-0">
                      <Link href={`/product/${s.slug}`} onClick={() => setAdded(null)} className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {s.image && <img src={s.image} alt="" className="aspect-square w-full rounded-xl object-cover" />}
                        <p className="mt-2 line-clamp-1 text-sm font-medium text-charcoal">{s.name}</p>
                        <p className="text-sm text-muted">{s.price}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand p-5">
              <button className="text-sm font-medium text-charcoal hover:underline" onClick={() => setAdded(null)}>Keep shopping</button>
              <button className="btn bg-rose text-white hover:bg-rose-deep" onClick={() => { setAdded(null); setOpen(true); }}>
                View cart <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs text-rose">{count}</span> →
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[60] animate-fade-in" role="dialog" aria-modal="true" aria-label="Your cart">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-ivory shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between border-b border-sand bg-white px-5 py-4">
              <p className="flex items-center gap-2 font-display font-semibold text-charcoal">Your Cart <span className="text-xs font-normal text-muted">{count}</span></p>
              <button className="btn-icon h-9 w-9" onClick={() => setOpen(false)} aria-label="Close cart" autoFocus>✕</button>
            </div>
            <div className={`flex-1 overflow-y-auto transition ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
              {!view ? (
                <p className="p-8 text-center text-sm text-muted">Loading…</p>
              ) : view.lines.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-display text-lg font-semibold text-charcoal">Your cart is empty</p>
                  <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary mt-5">Start shopping</Link>
                </div>
              ) : (
                <>
                  {view.freeShipping && (
                    <div className="border-b border-sand bg-white px-5 py-4">
                      <p className="text-sm text-charcoal">{view.freeShipping.remaining ? <><strong>{view.freeShipping.remaining}</strong> to free UAE delivery</> : <>🎉 You've unlocked <strong>free UAE delivery</strong></>}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand" aria-hidden="true"><div className="h-full rounded-full bg-rose transition-all" style={{ width: `${view.freeShipping.pct}%` }} /></div>
                    </div>
                  )}
                  <ul className="divide-y divide-sand bg-white">
                    {view.lines.map((l) => (
                      <li key={l.id} className="flex gap-3 px-5 py-4">
                        <Link href={`/product/${l.slug}`} onClick={() => setOpen(false)} className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {l.image && <img src={l.image} alt="" className="h-20 w-16 rounded-lg object-cover" />}
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <div><p className="text-sm font-semibold text-charcoal">{l.name}</p><p className="text-xs text-muted">{l.variant}</p></div>
                            <button onClick={() => setQty(l.id, 0)} className="h-6 text-muted hover:text-danger" aria-label={`Remove ${l.name}`} disabled={pending}>✕</button>
                          </div>
                          <p className="mt-1 text-xs">{l.compareAt && <s className="me-1 text-faint">{l.compareAt}</s>}<span className="font-medium text-charcoal">{l.unit}</span></p>
                          {l.problem && <p className="text-xs text-danger" role="alert">{l.problem === "insufficient" ? `Only ${l.max} available` : "No longer available"}</p>}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-full border border-sand">
                              <button className="px-3 py-1 disabled:opacity-30" onClick={() => setQty(l.id, l.qty - 1)} disabled={pending || l.qty <= 1} aria-label={`Decrease quantity of ${l.name}`}>−</button>
                              <span className="w-6 text-center text-sm" aria-label={`Quantity ${l.qty}`}>{l.qty}</span>
                              <button className="px-3 py-1 disabled:opacity-30" onClick={() => setQty(l.id, l.qty + 1)} disabled={pending || l.qty >= l.max} aria-label={`Increase quantity of ${l.name}`}>+</button>
                            </div>
                            <p className="text-sm font-semibold text-charcoal">{l.total}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {view.suggestions.length > 0 && (
                    <div className="px-5 py-4">
                      <p className="mb-2 text-sm font-medium text-charcoal">You may also like…</p>
                      <ul className="space-y-2">{view.suggestions.slice(0, 2).map((s) => (
                        <li key={s.slug} className="flex items-center gap-3 rounded-xl bg-white p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {s.image && <img src={s.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                          <div className="flex-1"><p className="text-sm font-medium text-charcoal">{s.name}</p><p className="text-xs text-muted">{s.price}</p></div>
                          <Link href={`/product/${s.slug}`} onClick={() => setOpen(false)} className="text-xs font-medium text-charcoal underline">View</Link>
                        </li>
                      ))}</ul>
                    </div>
                  )}
                </>
              )}
            </div>
            {view && view.lines.length > 0 && (
              <div className="border-t border-sand bg-white p-5">
                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-display text-lg font-semibold text-charcoal">{view.subtotal}</span></div>
                <p className="mt-1 text-xs text-faint">Delivery and taxes calculated at checkout.</p>
                <Link href="/checkout" onClick={() => setOpen(false)} className={`btn mt-4 w-full bg-rose text-white hover:bg-rose-deep ${view.lines.some((l) => l.problem) ? "pointer-events-none opacity-50" : ""}`}>Proceed to checkout</Link>
                <Link href="/cart" onClick={() => setOpen(false)} className="mt-2 block text-center text-xs text-muted hover:underline">View full cart</Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </CartCtx.Provider>
  );
}

export function CartButton({ label }: { label: string }) {
  const { open, count } = useCart();
  return (
    <button type="button" onClick={open} className="btn-icon" aria-label={`${label} (${count})`}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
      {count > 0 && <span className="absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">{count}</span>}
    </button>
  );
}
