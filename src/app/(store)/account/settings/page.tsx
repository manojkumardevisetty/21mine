import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/authz";
import { signOutEverywhereAction } from "@/app/actions/account";
import { AccountShell } from "@/components/account/AccountShell";
import { DataRequestForm, MarketingForm, PasswordForm, ProfileForm } from "@/components/account/Forms";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Settings() {
  const su = await requireUser("/account/settings");
  const u = (await db.query.users.findFirst({ where: eq(schema.users.id, su.id) }))!;
  return (
    <AccountShell title="Account settings" active="/account/settings">
      <div className="grid max-w-2xl gap-8">
        <section className="card p-6"><h2 className="mb-4 font-display text-2xl">Your details</h2><ProfileForm name={u.name} phone={u.phone ?? ""} email={u.email} /></section>
        <section className="card p-6"><h2 className="mb-4 font-display text-2xl">Change password</h2><PasswordForm /></section>
        <section className="card p-6"><h2 className="mb-4 font-display text-2xl">Email preferences</h2><MarketingForm on={u.marketingOptIn} /><p className="mt-3 text-xs text-muted">Order and account emails (confirmations, invoices, password resets) are always sent.</p></section>
        <section className="card p-6">
          <h2 className="mb-2 font-display text-2xl">Security</h2>
          <p className="mb-4 text-sm text-muted">Signed in on a shared or lost device? Sign out everywhere, including here.</p>
          <form action={signOutEverywhereAction}><SubmitButton className="btn-secondary btn-sm" pendingText="Signing out…">Sign out of all devices</SubmitButton></form>
        </section>
        <section className="card p-6">
          <h2 className="mb-2 font-display text-2xl">Your data</h2>
          <p className="mb-4 text-sm text-muted">Request a copy of your personal data or deletion of your account. We respond within 30 days. See our <a href="/policies/privacy" className="link">Privacy Policy</a>.</p>
          <DataRequestForm />
        </section>
      </div>
    </AccountShell>
  );
}
