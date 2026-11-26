import { requireStaff } from "@/lib/authz";
import { listCurrencies } from "@/lib/currency";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveCurrencyAction } from "../actions";

export const metadata = { title: "Currencies" };
export default async function Currencies() {
  await requireStaff(true);
  const list = await listCurrencies(false);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="h-display text-4xl">Currencies & exchange rates</h1>
      <p className="text-sm text-muted">Catalogue prices are in AED. Customers can view and pay in any enabled currency; each order stores the rate used. Pegged currencies (USD, SAR, QAR, BHD, OMR) rarely change - update EUR, GBP, INR and KWD regularly. Your payment gateway must support settlement/presentment in each enabled currency.</p>
      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.code} className="card p-4">
            <ActionForm action={saveCurrencyAction} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]" submit="Save">
              <input type="hidden" name="code" value={c.code} />
              <div><p className="font-medium">{c.code} · {c.name}</p><p className="text-xs text-muted">{c.exponent} decimals · updated {c.updatedAt.toLocaleDateString("en-GB")}</p></div>
              <div><label className="label text-xs" htmlFor={`r-${c.code}`}>1 AED =</label><input id={`r-${c.code}`} name="rate" defaultValue={(c.rateMicros / 1e6).toString()} className="input" disabled={c.isBase} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={c.enabled} disabled={c.isBase} /> Enabled</label>
            </ActionForm>
          </div>
        ))}
      </div>
    </div>
  );
}
