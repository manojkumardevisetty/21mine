import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="container-x py-10">
      <nav aria-label="Breadcrumb" className="text-xs text-muted"><Link href="/cart" className="hover:underline">Bag</Link> / <span aria-current="page">Checkout</span></nav>
      <h1 className="h-display mt-3 text-4xl">Checkout</h1>
      <div className="mt-8">
        <CheckoutForm
          idempotencyKey={randomUUID()} currency={currency.code} email={user?.email ?? ""} signedIn={!!user}
          countries={countries} emirates={UAE_EMIRATES}
          addresses={addresses.map((a) => ({ ...a }))}
          methods={methods} simulated={provider.simulated}
          lines={cart.lines.map((l, i) => ({ name: l.productName, variant: l.variantName, qty: l.quantity, total: formatMinor(q.lines[i].lineMinor, q.currency, q.exponent), image: l.image }))}
          initialQuote={initialQuote}
        />
      </div>
    </div>
  );
}
