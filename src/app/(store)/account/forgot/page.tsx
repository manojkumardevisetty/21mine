import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/account/Forms";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default function Forgot() {
  return (
    <div className="container-x max-w-md py-14">
      <h1 className="h-display text-4xl">Reset your password</h1>
      <p className="mt-2 text-muted">Enter the email you registered with and we'll send you a reset link.</p>
      <div className="mt-8"><ForgotForm /></div>
      <p className="mt-6 text-sm"><Link href="/account/login" className="link">Back to sign in</Link></p>
    </div>
  );
}
