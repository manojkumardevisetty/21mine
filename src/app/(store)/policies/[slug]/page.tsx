import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fillTokens, getPolicy, listPolicies, policyTokens } from "@/lib/policies";
import { renderMarkdown } from "@/lib/markdown";
import { getSettings } from "@/lib/settings";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPolicy((await params).slug);
  return p ? { title: p.title } : {};
}
export const dynamic = "force-dynamic";

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, all, s] = await Promise.all([getPolicy(slug), listPolicies(), getSettings()]);
  if (!p) notFound();
  const html = renderMarkdown(fillTokens(p.content, policyTokens(s, p.updatedAt)));
  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Policies" className="min-w-0 lg:sticky lg:top-28 lg:h-fit">
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {all.map((x) => (
            <li key={x.slug}><Link href={`/policies/${x.slug}`} aria-current={x.slug === slug ? "page" : undefined}
              className={`block whitespace-nowrap rounded-xl px-3 py-2 text-sm ${x.slug === slug ? "bg-charcoal text-ivory" : "hover:bg-cream"}`}>{x.title}</Link></li>
          ))}
        </ul>
      </nav>
      <article className="min-w-0 max-w-3xl">
        <h1 className="h-display text-4xl sm:text-5xl">{p.title}</h1>
        <div className="prose-policy mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
