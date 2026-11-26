"use client";
import { StatefulForm } from "./StatefulForm";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction, quoteAction, type QuoteView } from "@/app/actions/checkout";
import { Alert, Field, SelectField, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";

type Addr = { id: string; label: string; fullName: string; phone: string; country: string; region: string; city: string; street: string | null; building: string; unit: string | null; landmark: string | null; postalCode: string | null; isDefault: boolean };
type Props = {
  idempotencyKey: string; currency: string; email: string; signedIn: boolean;
  countries: { code: string; name: string; postal: boolean }[]; emirates: readonly string[];
  addresses: Addr[]; methods: { id: string; label: string; description: string }[]; simulated: boolean;
  lines: { name: string; variant: string; qty: number; total: string; image: string | null }[];
  initialQuote: QuoteView;
};

export function CheckoutForm(p: Props) {
  const def = p.addresses.find((a) => a.isDefault) ?? p.addresses[0];
  const [addr, setAddr] = useState<Partial<Addr>>(def ?? { country: "AE" });
  const [addrKey, setAddrKey] = useState(def?.id ?? "new");
  const [discount, setDiscount] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [quote, setQuote] = useState<QuoteView>(p.initialQuote);
  const [quoting, startQuote] = useTransition();
  const [state, action] = useActionState(placeOrderAction, null);
  const errors = state?.errors ?? {};
  const country = addr.country ?? "AE";
  const countryInfo = useMemo(() => p.countries.find((c) => c.code === country), [p.countries, country]);
  const isUAE = country === "AE";

  useEffect(() => {
    startQuote(async () => {
      setQuote(await quoteAction({ country, region: addr.region ?? "", discountCode: appliedCode, currency: p.currency }));
    });
  }, [country, addr.region, appliedCode, p.currency]);

  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const chooseSaved = (id: string) => {
    setAddrKey(id);
    const a = p.addresses.find((x) => x.id === id);
    setAddr(a ?? { country: "AE" });
  };

  return (
    <StatefulForm action={action} className="grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
      <input type="hidden" name="idempotencyKey" value={p.idempotencyKey} />
      <input type="hidden" name="currency" value={p.currency} />
      <input type="hidden" name="expectedTotal" value={quote.totalMinor} />
      <input type="hidden" name="discountCode" value={appliedCode} />
      <div className="space-y-10">
        {state && !state.ok && <Alert kind="error" title="We couldn't place your order">{state.message}</Alert>}

        <section aria-labelledby="c-h" className="space-y-4">
          <h2 id="c-h" className="font-display text-2xl">1. Contact</h2>
          {!p.signedIn && <p className="text-sm text-muted">Checking out as a guest. <Link href="/account/login?next=/checkout" className="link">Sign in</Link> to use saved addresses and track orders in your account.</p>}
          <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={p.email} error={errors.email} hint="We'll send your order confirmation and invoice link here" required />
        </section>

        <section aria-labelledby="d-h" className="space-y-4">
          <h2 id="d-h" className="font-display text-2xl">2. Delivery address</h2>
          {p.addresses.length > 0 && (
            <SelectField label="Saved addresses" name="savedAddress" value={addrKey} onChange={(e) => chooseSaved(e.target.value)}>
              {p.addresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.building}, {a.city}, {a.region}</option>)}
              <option value="new">Use a new address</option>
            </SelectField>
          )}
          <div className="grid gap-4 sm:grid-cols-2" key={addrKey}>
            <Field label="Full name" name="fullName" autoComplete="name" defaultValue={addr.fullName} onChange={set("fullName")} error={errors.fullName} required />
            <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" defaultValue={addr.phone ?? (isUAE ? "+971 " : "")} onChange={set("phone")} error={errors.phone} hint={isUAE ? "e.g. +971 50 123 4567 - the courier will call this number" : "Include your country code"} required />
            <SelectField label="Country" name="country" value={country} onChange={(e) => setAddr((a) => ({ ...a, country: e.target.value, region: "" }))} error={errors.country} autoComplete="country">
              {p.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </SelectField>
            {isUAE ? (
              <SelectField label="Emirate" name="region" value={addr.region ?? ""} onChange={set("region")} error={errors.region} required>
                <option value="">Select emirate</option>
                {p.emirates.map((e) => <option key={e} value={e}>{e}</option>)}
              </SelectField>
            ) : (
              <Field label="State / province / region" name="region" autoComplete="address-level1" defaultValue={addr.region} onBlur={set("region")} error={errors.region} required />
            )}
            <Field label={isUAE ? "Area / community" : "City / town"} name="city" autoComplete="address-level2" defaultValue={addr.city} onChange={set("city")} error={errors.city} hint={isUAE ? "e.g. Dubai Marina, Al Nahda, Khalifa City" : undefined} required />
            <Field label="Street" name="street" autoComplete="address-line2" defaultValue={addr.street ?? ""} onChange={set("street")} error={errors.street} optional />
            <Field label={isUAE ? "Building or villa name / number" : "Address line 1"} name="building" autoComplete="address-line1" defaultValue={addr.building} onChange={set("building")} error={errors.building} required />
            <Field label={isUAE ? "Apartment / unit / floor" : "Apartment / unit"} name="unit" defaultValue={addr.unit ?? ""} onChange={set("unit")} error={errors.unit} optional />
            <Field label="Nearby landmark" name="landmark" defaultValue={addr.landmark ?? ""} onChange={set("landmark")} error={errors.landmark} optional hint={isUAE ? "Helps the courier find you" : undefined} />
            {countryInfo?.postal && <Field label="Postal / ZIP code" name="postalCode" autoComplete="postal-code" defaultValue={addr.postalCode ?? ""} onChange={set("postalCode")} error={errors.postalCode} required />}
          </div>
          <TextArea label="Delivery notes" name="deliveryNotes" maxLength={300} optional placeholder="e.g. Call on arrival, leave with concierge" />
          {p.signedIn && addrKey === "new" && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="saveAddress" className="h-4 w-4 accent-[#2B2B2B]" defaultChecked /> Save this address to my account</label>
          )}
          {!quote.deliverable && (addr.region || !isUAE) && <Alert kind="warn">We don't deliver to {countryInfo?.name ?? "this destination"} yet. Please choose another address or <Link href="/contact" className="link">contact us</Link>.</Alert>}
        </section>

        <section aria-labelledby="p-h" className="space-y-4">
          <h2 id="p-h" className="font-display text-2xl">3. Payment</h2>
          {p.simulated && (
            <Alert kind="info" title="Test payments">
              Card payments are in test mode: no money is collected and no card details are requested.
            </Alert>
          )}
          {p.methods.length === 0 ? (
            <Alert kind="error">Online payment is temporarily unavailable. Please try again later or contact us.</Alert>
          ) : (
            <fieldset>
              <legend className="sr-only">Payment method</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.methods.map((m, i) => (
                  <label key={m.id} className="card flex cursor-pointer items-start gap-3 p-4 has-[:checked]:border-charcoal has-[:checked]:bg-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose-deep">
                    <input type="radio" name="paymentMethod" value={m.id} defaultChecked={i === 0} className="mt-1 h-4 w-4 accent-[#2B2B2B]" />
                    <span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-muted">{m.description}</span></span>
                  </label>
                ))}
              </div>
              {errors.paymentMethod && <p className="field-error" role="alert">{errors.paymentMethod}</p>}
            </fieldset>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-5 lg:sticky lg:top-28" aria-labelledby="s-h">
        <div className="card space-y-4 p-6">
          <h2 id="s-h" className="font-display text-2xl">4. Review & pay</h2>
          <ul className="space-y-3">
            {p.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image && <img src={l.image} alt="" className="h-14 w-11 rounded-lg object-cover" />}
                <span className="flex-1"><span className="block">{l.name}</span><span className="text-xs text-muted">{l.variant} × {l.qty}</span></span>
                <span>{l.total}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <label htmlFor="disc" className="sr-only">Discount code</label>
            <input id="disc" className="input" placeholder="Discount code" value={discount} onChange={(e) => setDiscount(e.target.value.toUpperCase())} aria-invalid={errors.discountCode ? true : undefined} />
            <button type="button" className="btn-secondary btn-sm" onClick={() => setAppliedCode(discount.trim())} disabled={!discount.trim() || quoting}>Apply</button>
          </div>
          {(quote.discountMessage || errors.discountCode) && (
            <p className={`text-xs ${quote.discountCode && !errors.discountCode ? "text-ok" : "text-danger"}`} role="status">
              {errors.discountCode ?? quote.discountMessage}
              {appliedCode && <button type="button" className="ms-2 underline" onClick={() => { setAppliedCode(""); setDiscount(""); }}>Remove</button>}
            </p>
          )}
          <dl className={`space-y-2 border-t border-sand pt-4 text-sm transition ${quoting ? "opacity-50" : ""}`} aria-live="polite" aria-busy={quoting}>
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote.subtotal}</dd></div>
            {quote.discount && <div className="flex justify-between text-ok"><dt>Discount ({quote.discountCode})</dt><dd>{quote.discount}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.shipping ?? (quote.deliverable ? "-" : "Enter address")}</dd></div>
            {quote.tax && <div className="flex justify-between text-muted"><dt>{quote.taxLabel}</dt><dd>{quote.tax}</dd></div>}
            <div className="flex justify-between border-t border-sand pt-3 text-base font-semibold"><dt>Total to pay</dt><dd>{quote.total}</dd></div>
          </dl>
          {errors.total && <Alert kind="warn">{errors.total}</Alert>}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 accent-[#2B2B2B]" aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? "terms-err" : undefined} />
            <span>I agree to the <Link href="/policies/terms" target="_blank" className="link">Terms of Sale</Link> and <Link href="/policies/returns" target="_blank" className="link">Returns Policy</Link>, and have read the <Link href="/policies/privacy" target="_blank" className="link">Privacy Policy</Link>.</span>
          </label>
          {errors.acceptTerms && <p id="terms-err" className="field-error" role="alert">{errors.acceptTerms}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="Placing order…" disabled={quoting || p.methods.length === 0}>
            {p.simulated ? `Place order - ${quote.total}` : `Pay ${quote.total}`}
          </SubmitButton>
          <p className="text-center text-xs text-muted">{p.currency !== "AED" ? `You will be charged in ${p.currency}. Your bank may apply its own fees.` : "All prices in UAE Dirhams (AED)."}</p>
        </div>
      </aside>
    </StatefulForm>
  );
}
