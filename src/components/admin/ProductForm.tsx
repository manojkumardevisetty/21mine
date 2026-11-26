import { ActionForm } from "./ActionForm";
import { saveProductAction } from "@/app/admin/actions";

type P = { id?: string; name?: string; nameAr?: string | null; slug?: string; kind?: string; categoryId?: string; shortDescription?: string; description?: string; details?: Record<string, string>; highlights?: string[]; careInfo?: string | null; isPublished?: boolean; isFeatured?: boolean };

export function ProductForm({ p = {}, categories }: { p?: P; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveProductAction} submit={p.id ? "Save product" : "Create product"} className="grid gap-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} className="input" required /></div>
        <div><label className="label" htmlFor="nameAr">Arabic name (optional)</label><input id="nameAr" name="nameAr" dir="rtl" defaultValue={p.nameAr ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={p.slug} className="input" placeholder="auto from name" /></div>
        <div><label className="label" htmlFor="kind">Product type</label>
          <select id="kind" name="kind" defaultValue={p.kind ?? "PERFUME"} className="input"><option value="PERFUME">Perfume</option><option value="PRESS_ON_NAILS">Press-on nails</option><option value="NAIL_ACCESSORY">Nail accessory</option><option value="FASHION_ACCESSORY">Fashion accessory</option></select></div>
        <div><label className="label" htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={p.categoryId} className="input">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="sd">Short description</label><input id="sd" name="shortDescription" defaultValue={p.shortDescription} className="input" maxLength={200} /></div>
      <div><label className="label" htmlFor="desc">Full description</label><textarea id="desc" name="description" defaultValue={p.description} className="input min-h-32" /></div>
      <div><label className="label" htmlFor="det">Product details (one per line, “Label: value”)</label>
        <textarea id="det" name="details" defaultValue={Object.entries(p.details ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")} className="input min-h-40 font-mono text-xs" placeholder={"Concentration: Eau de Parfum\nTop notes: Bergamot, saffron\nShape: Almond\nFinish: Gloss"} />
        <p className="hint">Perfume: concentration, notes, size. Nails: shape, length, finish, sizes. Jewellery: material, plating, dimensions.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="hl">Highlights (one per line, max 8)</label><textarea id="hl" name="highlights" defaultValue={(p.highlights ?? []).join("\n")} className="input min-h-24" /></div>
        <div><label className="label" htmlFor="care">Safety & care</label><textarea id="care" name="careInfo" defaultValue={p.careInfo ?? ""} className="input min-h-24" /></div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={p.isPublished ?? false} /> Published (visible in store)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured ?? false} /> Featured on home page</label>
      </div>
      {!p.id && <p className="text-xs text-muted">New products are created unpublished. Add variants (price & stock) and images, then publish.</p>}
    </ActionForm>
  );
}
