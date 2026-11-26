import Link from "next/link";
import { requireStaff } from "@/lib/authz";
import { listPolicies } from "@/lib/policies";

export const metadata = { title: "Policies" };
export default async function Policies() {
  await requireStaff(true);
  const list = await listPolicies();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="h-display text-4xl">Policy pages</h1>
      <p className="text-sm text-muted">Drafted from your store configuration. Business details, delivery table, VAT statement and contact block are filled in automatically from Store settings using tokens like {"{{legalName}}"}. Have each page reviewed by a UAE lawyer, then mark it approved.</p>
      <ul className="space-y-2">{list.map((p) => (
        <li key={p.slug} className="card flex items-center justify-between p-4"><Link href={`/admin/policies/${p.slug}`} className="link">{p.title}</Link>
          <span className={`chip ${p.needsReview ? "bg-[#FBF3E4] text-warn" : "bg-ok/10 text-ok"}`}>{p.needsReview ? "Needs legal review" : "Approved"}</span></li>
      ))}</ul>
    </div>
  );
}
