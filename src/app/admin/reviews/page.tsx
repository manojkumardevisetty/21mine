import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { Stars } from "@/components/Stars";
import { SubmitButton } from "@/components/SubmitButton";
import { moderateReviewAction } from "../actions";

export const metadata = { title: "Reviews" };
export default async function Reviews({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireStaff();
  const s = (await searchParams).s ?? "PENDING";
  const status = (["PENDING", "APPROVED", "REJECTED"].includes(s) ? s : "PENDING") as "PENDING" | "APPROVED" | "REJECTED";
  const list = await db.select({ r: schema.reviews, product: schema.products.name, slug: schema.products.slug, email: schema.users.email })
    .from(schema.reviews).innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId)).innerJoin(schema.users, eq(schema.users.id, schema.reviews.userId))
    .where(eq(schema.reviews.status, status)).orderBy(desc(schema.reviews.createdAt)).limit(200);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="h-display text-4xl">Reviews</h1>
      <p className="text-sm text-muted">Only customers with a paid order for the product can submit a review (verified purchase). Approve genuine reviews; reject spam or abusive content. Don't edit or invent reviews.</p>
      <nav className="flex gap-2">{["PENDING", "APPROVED", "REJECTED"].map((x) => <Link key={x} href={`?s=${x}`} className={`chip px-3 py-1.5 ${x === status ? "bg-charcoal text-ivory" : "bg-cream"}`}>{x.toLowerCase()}</Link>)}</nav>
      {list.length === 0 && <p className="text-muted">No {status.toLowerCase()} reviews.</p>}
      {list.map(({ r, product, slug, email }) => (
        <article key={r.id} className="card p-5">
          <p className="text-xs text-muted"><Link href={`/product/${slug}`} className="link">{product}</Link> · {r.displayName} ({email}) · {r.createdAt.toLocaleDateString("en-GB")}</p>
          <p className="mt-2 flex items-center gap-2"><Stars value={r.rating} size={14} /><strong>{r.title}</strong></p>
          <p className="mt-1 text-sm">{r.body}</p>
          <div className="mt-3 flex gap-2">
            {status !== "APPROVED" && <form action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="APPROVED" /><SubmitButton className="btn-primary btn-sm" pendingText="Approving…">Approve</SubmitButton></form>}
            {status !== "REJECTED" && <form action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="REJECTED" /><SubmitButton className="btn-ghost btn-sm text-danger" pendingText="Rejecting…">Reject</SubmitButton></form>}
          </div>
        </article>
      ))}
    </div>
  );
}
