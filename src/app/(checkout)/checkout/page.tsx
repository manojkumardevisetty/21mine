import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadCart, readCartId } from "@/lib/cart";
import { currentCurrency } from "@/lib/currency";
import { getUser } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { COUNTRIES, UAE_EMIRATES } from "@/lib/countries";
import { getProvider } from "@/lib/payments";
import { formatMinor } from "@/lib/money";
import { quoteAction } from "@/app/actions/checkout";
import { quoteCart } from "@/lib/checkout";
import { CheckoutForm } from "@/components/CheckoutForm";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, currency, user, s] = await Promise.all([loadCart(await readCartId()), currentCurrency(), getUser(), getSettings()]);
  if (cart.lines.length === 0) redirect("/cart");
  if (cart.lines.some((l) => l.problem)) redirect("/cart");
  const provider = getProvider();
  const ua = (await headers()).get("user-agent");
  const methods = provider.methods({ currency: currency.code, userAgent: ua });
  const enabledCountries = new Set(s.deliveryZones.filter((z) => z.enabled).map((z) => z.country));
  const countries = COUNTRIES.filter((c) => enabledCountries.has(c.code));
  const addresses = user ? await db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault), asc(schema.addresses.createdAt)) : [];
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const initialQuote = await quoteAction({ country: def?.country ?? "AE", region: def?.region ?? "", discountCode: "", currency: currency.code });
  const q = await quoteCart({ lines: cart.lines.map((l) => ({ variantId: l.variantId, unitPriceFils: l.unitPriceFils, quantity: l.quantity })), currencyCode: currency.code });

  return (
    <>
      <h1 className="sr-only">Checkout</h1>
      <CheckoutForm
        idempotencyKey={randomUUID()} currency={currency.code} email={user?.email ?? ""} userName={user?.name ?? null} signedIn={!!user}
        countries={countries} emirates={UAE_EMIRATES}
        addresses={addresses.map((a) => ({ ...a }))}
        methods={methods} testMode={provider.simulated}
        lines={cart.lines.map((l, i) => ({ name: l.productName, variant: l.variantName, qty: l.quantity, total: formatMinor(q.lines[i].lineMinor, q.currency, q.exponent), image: l.image }))}
        initialQuote={initialQuote}
      />
    </>
  );
}
