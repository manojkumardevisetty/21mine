"use client";
import { StatefulForm } from "./StatefulForm";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction, quoteAction, type QuoteView } from "@/app/actions/checkout";
import { Alert } from "./Field";
import { FloatInput, FloatSelect } from "./FloatField";
import { SubmitButton } from "./SubmitButton";
import { Logo } from "./Logo";

type Addr = { id: string; label: string; fullName: string; phone: string; country: string; region: string; city: string; street: string | null; building: string; unit: string | null; landmark: string | null; postalCode: string | null; isDefault: boolean };
type Props = {
  idempotencyKey: string; currency: string; email: string; userName: string | null; signedIn: boolean;
  countries: { code: string; name: string; postal: boolean }[]; emirates: readonly string[];
  addresses: Addr[]; methods: { id: string; label: string; description: string }[]; testMode: boolean;
  lines: { name: string; variant: string; qty: number; total: string; image: string | null }[];
  initialQuote: QuoteView;
};

const BRANDS: Record<string, React.ReactNode> = {
  card: <span className="flex gap-1"><span className="rounded border border-sand bg-white px-1.5 py-0.5 text-[10px] font-extrabold italic text-[#1A1F71]">VISA</span><span className="flex items-center rounded border border-sand bg-white px-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#EB001B]" /><span className="-ms-1 h-2.5 w-2.5 rounded-full bg-[#F79E1B] mix-blend-multiply" /></span></span>,
  apple_pay: <span className="rounded border border-sand bg-white px-1.5 py-0.5 text-[10px] font-semibold text-black"> Pay</span>,
  google_pay: <span className="rounded border border-sand bg-white px-1.5 py-0.5 text-[10px] font-medium"><span className="font-bold text-[#4285F4]">G</span> Pay</span>,
};

export function CheckoutForm(p: Props) {
  const def = p.addresses.find((a) => a.isDefault) ?? p.addresses[0];
  const [addr, setAddr] = useState<Partial<Addr>>(def ?? { country: "AE" });
  const [addrKey, setAddrKey] = useState(def?.id ?? "new");
  const [discount, setDiscount] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [method, setMethod] = useState(p.methods[0]?.id ?? "");
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
  const chooseSaved = (id: string) => { setAddrKey(id); setAddr(p.addresses.find((x) => x.id === id) ?? { country: "AE" }); };
  const count = p.lines.reduce((a, l) => a + l.qty, 0);

  const summary = (
    <div className="space-y-5">
      <ul className="space-y-4">
        {p.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-4">
            <span className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {l.image && <img src={l.image} alt="" className="h-16 w-16 rounded-xl border border-sand object-cover" />}
              <span className="absolute -end-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1 text-[11px] font-semibold text-white">{l.qty}</span>
            </span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-charcoal">{l.name}</span><span className="text-xs text-muted">{l.variant}</span></span>
            <span className="text-sm font-medium text-charcoal">{l.total}</span>
          </li>
        ))}
      </ul>
      <details className="group border-y border-sand py-3" open={!!appliedCode || !!errors.discountCode}>
        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-charcoal">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="text-rose">◇</span>Have a discount code?</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 flex gap-2">
          <label htmlFor="disc" className="sr-only">Discount code</label>
          <input id="disc" className="input" placeholder="Discount code" value={discount} onChange={(e) => setDiscount(e.target.value.toUpperCase())} aria-invalid={errors.discountCode ? true : undefined} />
          <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setAppliedCode(discount.trim())} disabled={!discount.trim() || quoting}>Apply</button>
        </div>
        {(quote.discountMessage || errors.discountCode) && (
          <p className={`mt-2 text-xs ${quote.discountCode && !errors.discountCode ? "text-ok" : "text-danger"}`} role="status">
            {errors.discountCode ?? quote.discountMessage}
            {appliedCode && <button type="button" className="ms-2 underline" onClick={() => { setAppliedCode(""); setDiscount(""); }}>Remove</button>}
          </p>
        )}
      </details>
      <dl className={`space-y-2.5 text-sm transition ${quoting ? "opacity-50" : ""}`} aria-live="polite" aria-busy={quoting}>
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="text-charcoal">{quote.subtotal}</dd></div>
        {quote.discount && <div className="flex justify-between text-ok"><dt>Discount ({quote.discountCode})</dt><dd>{quote.discount}</dd></div>}
        <div className="flex justify-between gap-6"><dt className="text-muted">Shipping</dt><dd className="text-end text-charcoal">{quote.shipping ?? (quote.deliverable ? "-" : <span className="text-xs text-muted">Enter your address to see shipping</span>)}</dd></div>
        {quote.tax && <div className="flex justify-between"><dt className="text-muted">{quote.taxLabel}</dt><dd className="text-charcoal">{quote.tax}</dd></div>}
        <div className="flex items-baseline justify-between border-t-2 border-charcoal pt-4"><dt className="font-display text-lg font-semibold text-charcoal">Total</dt><dd className="font-display text-2xl font-bold text-charcoal">{quote.total}</dd></div>
      </dl>
      {p.currency !== "AED" && <p className="text-xs text-muted">Charged in {p.currency}. Your bank may apply its own fees.</p>}
    </div>
  );

  return (
    <StatefulForm action={action} className="lg:grid lg:min-h-screen lg:grid-cols-[1.05fr_1fr]" noValidate>
      <input type="hidden" name="idempotencyKey" value={p.idempotencyKey} />
      <input type="hidden" name="currency" value={p.currency} />
      <input type="hidden" name="expectedTotal" value={quote.totalMinor} />
      <input type="hidden" name="discountCode" value={appliedCode} />

      {/* Left: form */}
      <div className="px-4 py-8 sm:px-8 lg:py-12 lg:pe-14 lg:ps-8">
        <div className="mx-auto max-w-[560px] lg:me-0">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="21mine home"><Logo /></Link>
            <Link href="/cart" className="text-sm text-muted hover:text-charcoal">← Back to cart</Link>
          </div>

          {/* Mobile summary */}
          <details className="group mt-6 rounded-2xl border border-sand bg-white p-4 lg:hidden">
            <summary className="flex cursor-pointer items-center justify-between text-sm">
              <span className="font-medium text-rose">Order summary ({count}) <span aria-hidden="true" className="inline-block transition group-open:rotate-180">⌄</span></span>
              <span className="font-display text-lg font-bold text-charcoal">{quote.total}</span>
            </summary>
            <div className="mt-4">{summary}</div>
          </details>

          {state && !state.ok && <div className="mt-6"><Alert kind="error" title="We couldn't place your order">{state.message}</Alert></div>}

          <section aria-labelledby="c-h" className="mt-8">
            <h2 id="c-h" className="font-display text-xl font-semibold text-charcoal">Information</h2>
            {p.signedIn ? (
              <p className="mt-2 text-sm text-muted">Welcome back, <strong className="text-charcoal">{p.userName}</strong> ({p.email}).</p>
            ) : (
              <p className="mt-2 text-sm text-muted">Have an account? <Link href="/account/login?next=/checkout" className="link">Sign in</Link> for saved addresses and order tracking.</p>
            )}
            <FloatInput className={p.signedIn ? "hidden" : "mt-4"} label="Email address" name="email" type="email" autoComplete="email" defaultValue={p.email} error={errors.email} required />
          </section>

          <section aria-labelledby="d-h" className="mt-8">
            <h2 id="d-h" className="font-display text-xl font-semibold text-charcoal">Shipping address</h2>
            {p.addresses.length > 0 && (
              <FloatSelect className="mt-4" label="Saved addresses" name="savedAddress" value={addrKey} onChange={(e) => chooseSaved(e.target.value)}>
                {p.addresses.map((a) => <option key={a.id} value={a.id}>{a.label} - {a.building}, {a.city}, {a.region}</option>)}
                <option value="new">Use a new address</option>
              </FloatSelect>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2" key={addrKey}>
              <FloatSelect label="Country / Region" name="country" value={country} onChange={(e) => setAddr((a) => ({ ...a, country: e.target.value, region: "" }))} error={errors.country} autoComplete="country" className={isUAE ? "" : "sm:col-span-2"}>
                {p.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </FloatSelect>
              {isUAE ? (
                <FloatSelect label="Emirate" name="region" value={addr.region ?? ""} onChange={set("region")} error={errors.region} required>
                  <option value="">Choose your emirate</option>
                  {p.emirates.map((e) => <option key={e} value={e}>{e}</option>)}
                </FloatSelect>
              ) : null}
              <FloatInput className="sm:col-span-2" label="Full name" name="fullName" autoComplete="name" defaultValue={addr.fullName ?? p.userName ?? ""} onChange={set("fullName")} error={errors.fullName} required />
              <FloatInput className="sm:col-span-2" label={isUAE ? "Building name or number" : "Address line 1"} name="building" autoComplete="address-line1" defaultValue={addr.building} onChange={set("building")} error={errors.building} required />
              <FloatInput className="sm:col-span-2" label={isUAE ? "Apartment / villa number, floor" : "Apartment, suite, unit"} name="unit" defaultValue={addr.unit ?? ""} onChange={set("unit")} error={errors.unit} optional />
              <FloatInput label="Street" name="street" autoComplete="address-line2" defaultValue={addr.street ?? ""} onChange={set("street")} error={errors.street} optional />
              <FloatInput label={isUAE ? "Area / district" : "City / town"} name="city" autoComplete="address-level2" defaultValue={addr.city} onChange={set("city")} error={errors.city} required />
              {!isUAE && <FloatInput label="State / province / region" name="region" autoComplete="address-level1" defaultValue={addr.region} onBlur={set("region")} error={errors.region} required />}
              {countryInfo?.postal && <FloatInput label="Postal / ZIP code" name="postalCode" autoComplete="postal-code" defaultValue={addr.postalCode ?? ""} onChange={set("postalCode")} error={errors.postalCode} required />}
              <FloatInput className="sm:col-span-2" label="Nearby landmark" name="landmark" defaultValue={addr.landmark ?? ""} onChange={set("landmark")} error={errors.landmark} optional />
              <FloatInput className="sm:col-span-2" label="Mobile number" name="phone" type="tel" autoComplete="tel" defaultValue={addr.phone ?? (isUAE ? "+971 " : "")} onChange={set("phone")} error={errors.phone} hint={isUAE ? "e.g. +971 50 123 4567 - the courier will call this number" : "Include your country code"} required />
              <FloatInput className="sm:col-span-2" label="Delivery notes" name="deliveryNotes" maxLength={300} optional />
            </div>
            {p.signedIn && addrKey === "new" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="saveAddress" className="h-4 w-4 accent-[#0F1523]" defaultChecked /> Save this address to my account</label>
            )}
            <p className="mt-4 text-sm text-muted">
              {!quote.deliverable && (addr.region || !isUAE)
                ? <span className="text-danger">We don&apos;t deliver to {countryInfo?.name ?? "this destination"} yet. Please choose another address or <Link href="/contact" className="link">contact us</Link>.</span>
                : quote.shipping ? <>Shipping: <strong className="text-charcoal">{quote.shipping}</strong></> : "Select your country and emirate to see delivery options."}
            </p>
          </section>

          <section aria-labelledby="p-h" className="mt-8">
            <h2 id="p-h" className="font-display text-xl font-semibold text-charcoal">Payment</h2>
            <p className="mt-1 text-xs text-muted">All transactions are secure and encrypted.{p.testMode && " Test mode: no money is collected."}</p>
            {p.methods.length === 0 ? (
              <div className="mt-3"><Alert kind="error">Online payment is temporarily unavailable. Please try again later or contact us.</Alert></div>
            ) : (
              <fieldset className="mt-3 overflow-hidden rounded-xl border border-sand bg-white">
                <legend className="sr-only">Payment method</legend>
                {p.methods.map((m) => {
                  const on = m.id === method;
                  const brand = m.id === "credit_card" || m.id === "debit_card" ? BRANDS.card : BRANDS[m.id];
                  return (
                    <label key={m.id} className={`block cursor-pointer border-b border-sand last:border-b-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-rose ${on ? "bg-white ring-1 ring-inset ring-charcoal" : ""}`}>
                      <span className="flex items-center gap-3 px-4 py-3.5">
                        <input type="radio" name="paymentMethod" value={m.id} checked={on} onChange={() => setMethod(m.id)} className="h-4 w-4 accent-[#0F1523]" />
                        <span className="flex-1 text-sm font-medium text-charcoal">{m.label}</span>
                        {brand}
                      </span>
                      {on && <span className="block border-t border-sand bg-ivory px-4 py-3 text-xs text-muted">Continue to secure payment to complete your order with {m.label}.</span>}
                    </label>
                  );
                })}
              </fieldset>
            )}
            {errors.paymentMethod && <p className="field-error" role="alert">{errors.paymentMethod}</p>}

            <label className="mt-5 flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 accent-[#0F1523]" aria-invalid={errors.acceptTerms ? true : undefined} aria-describedby={errors.acceptTerms ? "terms-err" : undefined} />
              <span>I agree to the <Link href="/policies/terms" target="_blank" className="link">Terms of Sale</Link> and <Link href="/policies/returns" target="_blank" className="link">Returns Policy</Link>, and have read the <Link href="/policies/privacy" target="_blank" className="link">Privacy Policy</Link>.</span>
            </label>
            {errors.acceptTerms && <p id="terms-err" className="field-error" role="alert">{errors.acceptTerms}</p>}
            {errors.total && <div className="mt-4"><Alert kind="warn">{errors.total}</Alert></div>}

            <SubmitButton className="btn mt-6 w-full bg-rose py-4 text-[15px] text-white hover:bg-rose-deep" pendingText="Processing…" disabled={quoting || p.methods.length === 0}>
              Continue to secure payment · {quote.total}
            </SubmitButton>
            <p className="mt-3 text-center text-xs text-muted"><span aria-hidden="true">🔒</span> Secure checkout</p>
          </section>
        </div>
      </div>

      {/* Right: summary (desktop) */}
      <aside className="hidden border-s border-sand bg-white lg:block" aria-label="Order summary">
        <div className="sticky top-0 max-w-[480px] px-12 py-12 pt-[120px]">{summary}</div>
      </aside>
    </StatefulForm>
  );
}
