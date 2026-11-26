import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/authz";
import { RegisterForm } from "@/components/account/Forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (await getUser()) redirect(next);
  return (
    <div className="container-x max-w-md py-14">
      <h1 className="h-display text-4xl">Create your account</h1>
      <p className="mt-2 text-muted">Already have one? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="link">Sign in</Link></p>
      <div className="mt-8"><RegisterForm next={next} /></div>
    </div>
  );
}
