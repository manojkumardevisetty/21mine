"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addItem, CartError, cartCount, ensureCartId, readCartId, setQuantity } from "@/lib/cart";

export type CartActionState = { ok: boolean; message: string; count?: number } | null;

const addSchema = z.object({ variantId: z.string().min(1, "Please choose an option"), quantity: z.coerce.number().int().min(1).max(10) });

export async function addToCartAction(_prev: CartActionState, fd: FormData): Promise<CartActionState> {
  const parsed = addSchema.safeParse({ variantId: fd.get("variantId"), quantity: fd.get("quantity") ?? 1 });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please choose an option." };
  try {
    const cartId = await ensureCartId();
    await addItem(cartId, parsed.data.variantId, parsed.data.quantity);
    revalidatePath("/", "layout");
    return { ok: true, message: "Added to your bag.", count: await cartCount() };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "We couldn't add this item. Please try again." };
  }
}

export async function updateCartItemAction(_prev: CartActionState, fd: FormData): Promise<CartActionState> {
  const itemId = String(fd.get("itemId") ?? "");
  const qty = Number(fd.get("quantity"));
  if (!itemId || !Number.isInteger(qty) || qty < 0) return { ok: false, message: "Invalid quantity." };
  const cartId = await readCartId();
  if (!cartId) return { ok: false, message: "Your bag has expired. Please add the item again." };
  try {
    await setQuantity(cartId, itemId, qty);
    revalidatePath("/", "layout");
    return { ok: true, message: qty === 0 ? "Item removed." : "Bag updated." };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "We couldn't update your bag. Please try again." };
  }
}
