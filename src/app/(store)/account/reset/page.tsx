import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/account/Forms";
import { Alert } from "@/components/Field";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-x max-w-md py-14">
      <h1 className="h-display text-4xl">Choose a new password</h1>
      <div className="mt-8">
        {token ? <ResetForm token={token} /> : <Alert kind="error">This reset link is missing its token. <Link href="/account/forgot" className="link">Request a new link</Link>.</Alert>}
      </div>
    </div>
  );
}
