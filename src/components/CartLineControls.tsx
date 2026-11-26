"use client";
import { useActionState } from "react";
import { updateCartItemAction } from "@/app/actions/cart";

export function CartLineControls({ itemId, quantity, max, name }: { itemId: string; quantity: number; max: number; name: string }) {
  const [state, action, pending] = useActionState(updateCartItemAction, null);
  const limit = Math.max(1, Math.min(10, max));
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-sand bg-white">
          <form action={action}><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="quantity" value={quantity - 1} />
            <button className="px-3 py-1.5 disabled:opacity-30" disabled={pending || quantity <= 1} aria-label={`Decrease quantity of ${name}`}>−</button></form>
          <span className="w-8 text-center text-sm" aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
          <form action={action}><input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="quantity" value={quantity + 1} />
            <button className="px-3 py-1.5 disabled:opacity-30" disabled={pending || quantity >= limit} aria-label={`Increase quantity of ${name}`}>+</button></form>
        </div>
        <form action={action}>
          <input type="hidden" name="itemId" value={itemId} /><input type="hidden" name="quantity" value={0} />
          <button className="text-xs text-muted underline hover:text-danger" disabled={pending}>Remove</button>
        </form>
      </div>
      {state && !state.ok && <p className="field-error" role="alert">{state.message}</p>}
    </div>
  );
}
