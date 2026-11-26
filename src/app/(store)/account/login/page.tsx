import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/authz";
import { LoginForm } from "@/components/account/Forms";
import { Alert } from "@/components/Field";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; signedout?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (await getUser()) redirect(next);
  return (
    <div className="container-x max-w-md py-14">
      <h1 className="h-display text-4xl">Sign in</h1>
      <p className="mt-2 text-muted">New to 21mine? <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="link">Create an account</Link></p>
      {sp.signedout && <div className="mt-6"><Alert kind="success">You've been signed out on all devices.</Alert></div>}
      <div className="mt-8"><LoginForm next={next} /></div>
      <p className="mt-6 text-sm text-muted">Placed an order as a guest? Use the link in your confirmation email to view it.</p>
    </div>
  );
}
