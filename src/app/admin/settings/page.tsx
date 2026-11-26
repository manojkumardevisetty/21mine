import { requireStaff } from "@/lib/authz";
import { getSettings, missingMerchantInfo } from "@/lib/settings";
import { COUNTRIES } from "@/lib/countries";
import { env } from "@/lib/env";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveSettingsAction, saveZonesAction } from "../actions";

export const metadata = { title: "Store settings" };
const CONFIRMABLE = [
  ["legalName", "Legal name"], ["tradeLicenceNumber", "Trade licence no."], ["businessAddress", "Business address"], ["supportEmail", "Support email"],
  ["supportPhone", "Support phone"], ["deliveryZones", "Delivery zones & fees"], ["returnWindowDays", "Return window & rules"], ["taxEnabled", "VAT status"], ["paymentProviderName", "Payment provider"],
];

export default async function Settings() {
  await requireStaff(true);
  const s = await getSettings();
  const missing = missingMerchantInfo(s);
  const f = (name: keyof typeof s, label: string, opts: { hint?: string; type?: string; wide?: boolean } = {}) => (
    <div className={opts.wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={opts.type ?? "text"} defaultValue={String(s[name] ?? "")} className="input" />
      {opts.hint && <p className="hint">{opts.hint}</p>}
    </div>
  );
  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="h-display text-4xl">Store settings</h1>
      {missing.length > 0 && (
        <div role="status" className="rounded-xl border border-warn/30 bg-[#FBF3E4] p-4 text-sm text-warn">
          <p className="font-semibold">Missing or unconfirmed merchant information</p>
          <ul className="mt-1 list-disc ps-5">{missing.map((m) => <li key={m.key}>{m.label}: {m.reason}</li>)}</ul>
        </div>
      )}
      <section className="card p-6">
        <h2 className="mb-1 font-display text-2xl">Business, tax & payments</h2>
        <p className="mb-4 text-sm text-muted">Shown on invoices, policy pages, the footer and the contact page. Each order stores a snapshot, so later edits don't change past invoices.</p>
        <ActionForm action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
          {f("brandName", "Brand name")}
          {f("legalName", "Legal business name", { hint: "As on the trade licence" })}
          {f("tradeLicenceNumber", "Trade licence number")}
          {f("licenceAuthority", "Licence issuing authority")}
          {f("businessAddress", "Registered business address", { wide: true })}
          {f("supportEmail", "Support email", { type: "email" })}
          {f("supportPhone", "Support phone / WhatsApp", { hint: "Not provided yet - add a real number before launch" })}
          {f("supportHours", "Support hours")}
          {f("returnWindowDays", "Return window (days)", { type: "number" })}
          <fieldset className="space-y-3 rounded-xl border border-sand p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">VAT</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="taxEnabled" defaultChecked={s.taxEnabled} /> Charge VAT (only once registered with the UAE FTA)</label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor="taxRateBps">Rate %</label><input id="taxRateBps" name="taxRateBps" defaultValue={(s.taxRateBps / 100).toString()} className="input" /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="trn">TRN (15 digits)</label><input id="trn" name="taxRegistrationNumber" defaultValue={s.taxRegistrationNumber ?? ""} className="input" inputMode="numeric" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pricesIncludeTax" defaultChecked={s.pricesIncludeTax} /> Catalogue prices include VAT</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="taxInvoiceConfirmed" defaultChecked={s.taxInvoiceConfirmed} /> I've confirmed tax-invoice wording/requirements with our tax advisor (shows “TAX INVOICE” + TRN on invoices)</label>
            <fieldset><legend className="text-xs text-muted">Apply VAT to deliveries in:</legend>
              <div className="mt-1 flex flex-wrap gap-3 text-xs">{COUNTRIES.map((c) => <label key={c.code} className="flex items-center gap-1"><input type="checkbox" name="taxCountries" value={c.code} defaultChecked={s.taxCountries.includes(c.code)} />{c.code}</label>)}</div>
            </fieldset>
          </fieldset>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ppn">Payment provider name (shown in policies)</label>
            <input id="ppn" name="paymentProviderName" defaultValue={s.paymentProviderName} className="input" />
            <p className="hint">Active provider (from environment): <strong>{env.paymentProvider}</strong> · mode: <strong>{env.storeMode}</strong>. Connecting a live gateway is done via environment variables - see SETUP.md.</p>
          </div>
          <fieldset className="rounded-xl border border-sand p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Merchant sign-off - tick items you've confirmed as final</legend>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">{CONFIRMABLE.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="confirmed" value={k} defaultChecked={s.confirmedFields.includes(k)} />{l}</label>)}</div>
          </fieldset>
        </ActionForm>
      </section>
      <section className="card p-6">
        <h2 className="mb-1 font-display text-2xl">Delivery zones (AED)</h2>
        <p className="mb-4 text-sm text-muted">A zone matches a country, optionally one region (emirate). Checkout only offers countries with an enabled zone. Fees are converted for other currencies.</p>
        <ActionForm action={saveZonesAction} submit="Save zones" className="space-y-3">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th className="p-1 text-start">On</th><th className="p-1 text-start">Country</th><th className="p-1 text-start">Region / emirate</th><th className="p-1 text-start">Fee</th><th className="p-1 text-start">Free over</th><th className="p-1 text-start">ETA days</th><th className="p-1 text-start">Delete</th></tr></thead>
            <tbody>{s.deliveryZones.map((z) => (
              <tr key={z.id} className="border-t border-sand">
                <td className="p-1"><input type="hidden" name="zid" value={z.id} /><input type="checkbox" name="enabled" value={z.id} defaultChecked={z.enabled} aria-label={`Enable ${z.label}`} /></td>
                <td className="p-1"><input name="country" defaultValue={z.country} className="input w-16 px-2 py-1" maxLength={2} aria-label="Country code" /></td>
                <td className="p-1"><input name="region" defaultValue={z.region ?? ""} className="input px-2 py-1" aria-label="Region" /></td>
                <td className="p-1"><input name="fee" defaultValue={(z.feeFils / 100).toFixed(2)} className="input w-24 px-2 py-1" aria-label="Fee" /></td>
                <td className="p-1"><input name="freeOver" defaultValue={z.freeOverFils ? (z.freeOverFils / 100).toFixed(2) : ""} className="input w-24 px-2 py-1" aria-label="Free over" /></td>
                <td className="p-1"><input name="eta" defaultValue={z.etaDays} className="input w-20 px-2 py-1" aria-label="ETA" /></td>
                <td className="p-1"><input type="checkbox" name="delete" value={z.id} aria-label={`Delete ${z.label}`} /></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="grid gap-2 rounded-xl border border-dashed border-sand p-3 sm:grid-cols-4">
            <input name="newCountry" className="input" placeholder="New: country code (e.g. FR)" maxLength={2} aria-label="New zone country" />
            <input name="newRegion" className="input" placeholder="Region (optional)" aria-label="New zone region" />
            <input name="newFee" className="input" placeholder="Fee AED" aria-label="New zone fee" />
            <input name="newEta" className="input" placeholder="ETA e.g. 5-10" aria-label="New zone ETA" />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
