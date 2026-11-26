import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { ProductForm } from "@/components/admin/ProductForm";
import { ActionForm } from "@/components/admin/ActionForm";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteVariantAction, imageCommandAction, saveVariantAction } from "../../actions";

export const metadata = { title: "Edit product" };
const major = (f: number | null) => (f === null ? "" : (f / 100).toFixed(2));

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const { created } = await searchParams;
  const [p, cats] = await Promise.all([
    db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] }, images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } } }),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
  ]);
  if (!p) notFound();
  const optionName = Object.keys(p.variants[0]?.options ?? {})[0] ?? "Size";
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-muted hover:underline">← Products</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-4xl">{p.name}</h1>
        {p.isPublished && <Link href={`/product/${p.slug}`} className="link text-sm" target="_blank">View in store ↗</Link>}
      </div>
      {created && <p role="status" className="rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm text-ok">Product created as a draft. Add variants and images, then tick “Published”.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="card p-6"><ProductForm p={p} categories={cats} /></div>
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-2xl">Images ({p.images.length})</h2>
            <ul className="grid grid-cols-3 gap-3">
              {p.images.map((im, i) => (
                <li key={im.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={im.alt} className="aspect-[4/5] w-full rounded-lg object-cover" />
                  {i === 0 && <span className="chip bg-charcoal text-ivory">Main</span>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {([...(i > 0 ? [["first", "Main", "Make main image"], ["up", "←", "Move earlier"]] : []), ...(i < p.images.length - 1 ? [["down", "→", "Move later"]] : []), ["delete", "Delete", "Delete image"]] as [string, string, string][]).map(([cmd, label, aria]) => (
                      <form key={cmd} action={imageCommandAction}>
                        <input type="hidden" name="id" value={im.id} /><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="cmd" value={cmd} />
                        <button className={`underline ${cmd === "delete" ? "text-danger" : ""}`} aria-label={aria}>{label}</button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <ImageUpload productId={p.id} productName={p.name} />
          </section>
        </div>
      </div>
      <section className="card space-y-4 p-5">
        <h2 className="font-display text-2xl">Variants, prices & stock</h2>
        <p className="text-sm text-muted">Prices are in AED (VAT-inclusive display). Other currencies are converted automatically. Changes are recorded in the audit log; existing orders keep their purchase-time prices.</p>
        <div className="space-y-3">
          {[...p.variants, null].map((v, idx) => (
            <div key={v?.id ?? "new"} className={`rounded-xl border p-3 ${v ? "border-sand" : "border-dashed border-rose"}`}>
              {!v && <p className="mb-2 text-sm font-medium">Add variant</p>}
              <ActionForm action={saveVariantAction} submit={v ? "Save" : "Add variant"} reset={!v} className="grid items-end gap-2 sm:grid-cols-4 lg:grid-cols-9">
                <input type="hidden" name="productId" value={p.id} />{v && <input type="hidden" name="id" value={v.id} />}
                <div className="lg:col-span-2"><label className="label text-xs" htmlFor={`sku${idx}`}>SKU</label><input id={`sku${idx}`} name="sku" defaultValue={v?.sku} className="input" /></div>
                <div><label className="label text-xs" htmlFor={`on${idx}`}>Option</label><input id={`on${idx}`} name="optionName" defaultValue={v ? Object.keys(v.options)[0] ?? optionName : optionName} className="input" /></div>
                <div className="lg:col-span-2"><label className="label text-xs" htmlFor={`n${idx}`}>Value / name</label><input id={`n${idx}`} name="name" defaultValue={v?.name} className="input" placeholder="50 ml, M, Gold…" /></div>
                <div><label className="label text-xs" htmlFor={`p${idx}`}>Price AED</label><input id={`p${idx}`} name="price" inputMode="decimal" defaultValue={major(v?.priceFils ?? null)} className="input" /></div>
                <div><label className="label text-xs" htmlFor={`c${idx}`}>Was AED</label><input id={`c${idx}`} name="compareAt" inputMode="decimal" defaultValue={major(v?.compareAtFils ?? null)} className="input" placeholder="optional" /></div>
                <div><label className="label text-xs" htmlFor={`s${idx}`}>Stock</label><input id={`s${idx}`} name="stock" type="number" min={0} defaultValue={v?.stock ?? 0} className="input" /></div>
                <input type="hidden" name="sortOrder" value={v?.sortOrder ?? p.variants.length} />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} /> Active</label>
              </ActionForm>
              {v && (
                <form action={deleteVariantAction} className="mt-1 text-end">
                  <input type="hidden" name="id" value={v.id} /><input type="hidden" name="productId" value={p.id} />
                  <SubmitButton className="text-xs text-danger underline" pendingText="…">Delete (deactivates if ordered before)</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
