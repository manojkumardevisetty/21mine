"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { SubmitButton } from "./SubmitButton";

type V = { id: string; name: string; options: Record<string, string>; stock: number; price: string; compareAt: string | null };

export function AddToBag({ variants, labels }: { variants: V[]; labels: { add: string; out: string; viewBag: string } }) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [state, action] = useActionState(addToCartAction, null);
  const v = useMemo(() => variants.find((x) => x.id === selected)!, [variants, selected]);
  const optionLabel = Object.keys(variants[0].options)[0] ?? "Option";
  const maxQty = Math.max(1, Math.min(10, v.stock));

  return (
    <form action={action} className="space-y-5">
      <p className="text-2xl" aria-live="polite">
        {v.price}{v.compareAt && <s className="ms-2 text-base text-muted">{v.compareAt}</s>}
      </p>
      {variants.length > 1 && (
        <fieldset>
          <legend className="label">{optionLabel}: <span className="font-normal">{v.name}</span></legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <label key={x.id} className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose-deep ${x.id === selected ? "border-charcoal bg-charcoal text-ivory" : "border-sand bg-white hover:border-charcoal"} ${x.stock <= 0 ? "opacity-50 line-through" : ""}`}>
                <input type="radio" name="variant-choice" value={x.id} checked={x.id === selected} onChange={() => { setSelected(x.id); setQty(1); }} className="sr-only" />
                {x.name}{x.stock <= 0 ? " - sold out" : ""}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <input type="hidden" name="variantId" value={v.id} />
      <p className={`text-sm ${v.stock <= 0 ? "text-danger" : v.stock <= 5 ? "text-warn" : "text-ok"}`}>
        {v.stock <= 0 ? "Out of stock" : v.stock <= 5 ? `Only ${v.stock} left - order soon` : "In stock - ready to ship"}
      </p>
      <div className="flex items-stretch gap-3">
        <div className="flex items-center rounded-full border border-sand bg-white">
          <button type="button" className="px-4 py-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>−</button>
          <label htmlFor="qty" className="sr-only">Quantity</label>
          <input id="qty" name="quantity" type="number" min={1} max={maxQty} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))} className="w-10 bg-transparent text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <button type="button" className="px-4 py-3" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity" disabled={qty >= maxQty}>+</button>
        </div>
        <SubmitButton className="btn-primary flex-1" disabled={v.stock <= 0} pendingText="Adding…">{v.stock <= 0 ? labels.out : labels.add}</SubmitButton>
      </div>
      {state && (
        <div role={state.ok ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? "border-ok/30 bg-ok/5 text-ok" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {state.message} {state.ok && <Link href="/cart" className="link ms-1 font-medium">{labels.viewBag} ({state.count})</Link>}
        </div>
      )}
    </form>
  );
}
