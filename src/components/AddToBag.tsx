"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { StatefulForm } from "./StatefulForm";
import { SubmitButton } from "./SubmitButton";
import { useCart } from "./CartDrawer";
import { PaymentPills } from "./PaymentPills";

type V = { id: string; name: string; options: Record<string, string>; stock: number; price: string; compareAt: string | null; unitMinor: number; compareMinor: number | null };

export function AddToBag({ variants, product, image, delivery, fmt }: {
  variants: V[]; product: string; image: string | null; delivery: string;
  fmt: { code: string; exponent: number; locale: string };
}) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [state, action] = useActionState(addToCartAction, null);
  const { showAdded, refresh } = useCart();
  const v = useMemo(() => variants.find((x) => x.id === selected)!, [variants, selected]);
  const optionLabel = Object.keys(variants[0].options)[0] ?? "Option";
  const maxQty = Math.max(1, Math.min(10, v.stock));
  const money = (minor: number) => new Intl.NumberFormat(fmt.locale === "ar" ? "ar-AE" : "en-AE", { style: "currency", currency: fmt.code, currencyDisplay: fmt.code === "AED" ? "code" : "symbol", minimumFractionDigits: fmt.exponent, maximumFractionDigits: fmt.exponent }).format(minor / 10 ** fmt.exponent).replace(/ /g, " ");
  const save = v.compareMinor && v.compareMinor > v.unitMinor ? (v.compareMinor - v.unitMinor) * qty : 0;

  useEffect(() => {
    if (state?.ok) { showAdded({ name: product, variant: v.name, image }); refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <StatefulForm action={action} className="space-y-5">
      {variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-charcoal">{optionLabel}: <span className="font-normal text-muted">{v.name}</span></legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((x) => (
              <label key={x.id} className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-3 py-3 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose ${x.id === selected ? "border-charcoal ring-1 ring-charcoal" : "border-sand hover:border-charcoal/40"} ${x.stock <= 0 ? "opacity-50" : ""}`}>
                <input type="radio" name="variant-choice" value={x.id} checked={x.id === selected} onChange={() => { setSelected(x.id); setQty(1); }} className="sr-only" />
                <span className="flex items-center gap-1.5 font-semibold text-charcoal">{x.id === selected && <span className="h-1.5 w-1.5 rounded-full bg-rose" aria-hidden="true" />}{x.name}</span>
                <span className="mt-0.5 text-xs text-muted">{x.stock <= 0 ? "Sold out" : x.price}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <input type="hidden" name="variantId" value={v.id} />

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-charcoal">Quantity</span>
        <div className="flex items-center rounded-full border border-sand bg-white">
          <button type="button" className="px-4 py-2.5 disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>−</button>
          <label htmlFor="qty" className="sr-only">Quantity</label>
          <input id="qty" name="quantity" type="number" min={1} max={maxQty} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))} className="w-9 bg-transparent text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <button type="button" className="px-4 py-2.5 disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity" disabled={qty >= maxQty}>+</button>
        </div>
      </div>

      <div className="rounded-2xl border-t-2 border-charcoal bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-charcoal">Your total</span>
          <div className="text-end" aria-live="polite">
            {save > 0 && <p className="text-xs font-semibold text-ok">You save {money(save)}</p>}
            <p className="font-display text-2xl font-bold text-charcoal">{save > 0 && <s className="me-2 text-sm font-normal text-faint">{money((v.compareMinor ?? 0) * qty)}</s>}{money(v.unitMinor * qty)}</p>
          </div>
        </div>
      </div>

      <SubmitButton className="btn w-full bg-rose py-4 text-[15px] text-white hover:bg-rose-deep" disabled={v.stock <= 0} pendingText="Adding…">{v.stock <= 0 ? "Sold out" : "Add to cart"}</SubmitButton>
      {state && !state.ok && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>}

      <p className={`flex items-start gap-2 text-sm ${v.stock <= 0 ? "text-danger" : "text-ok"}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></svg>
        <span>{v.stock <= 0 ? "Out of stock" : <><strong className="font-semibold">{v.stock <= 5 ? `Only ${v.stock} left` : "In stock"}</strong>, {delivery}</>}</span>
      </p>
      <PaymentPills />
    </StatefulForm>
  );
}
