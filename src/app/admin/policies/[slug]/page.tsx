import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { getPolicy } from "@/lib/policies";
import { ActionForm } from "@/components/admin/ActionForm";
import { savePolicyAction } from "../../actions";

export const metadata = { title: "Edit policy" };
export default async function EditPolicy({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff(true);
  const p = await getPolicy((await params).slug);
  if (!p) notFound();
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/policies" className="text-sm text-muted hover:underline">← Policies</Link>
      <div className="flex items-center justify-between"><h1 className="h-display text-4xl">{p.title}</h1><Link href={`/policies/${p.slug}`} target="_blank" className="link text-sm">Preview ↗</Link></div>
      <ActionForm action={savePolicyAction} className="space-y-4">
        <input type="hidden" name="slug" value={p.slug} />
        <div><label className="label" htmlFor="title">Title</label><input id="title" name="title" defaultValue={p.title} className="input" /></div>
        <div><label className="label" htmlFor="content">Content (Markdown: ## headings, - lists, **bold**, [links](/path), | tables |)</label>
          <textarea id="content" name="content" defaultValue={p.content} className="input min-h-[60vh] font-mono text-xs" /></div>
        <p className="text-xs text-muted">Tokens: {"{{brandName}} {{legalName}} {{tradeLicence}} {{licenceAuthority}} {{address}} {{supportEmail}} {{siteUrl}} {{paymentProvider}} {{returnDays}} {{deliveryTable}} {{taxStatement}} {{contactBlock}} {{updated}}"}</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="approved" defaultChecked={!p.needsReview} /> Reviewed and approved for publication</label>
      </ActionForm>
    </div>
  );
}
