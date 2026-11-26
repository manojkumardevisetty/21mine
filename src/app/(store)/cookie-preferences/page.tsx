import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Cookie preferences" };
export default function CookiePrefs() {
  return (
    <div className="container-x max-w-2xl py-12">
      <h1 className="h-display text-4xl">Cookie preferences</h1>
      <p className="mt-4 text-muted">21mine only uses cookies that are strictly necessary for the store to work. There are currently no optional cookies (no analytics, advertising or social-media trackers), so there is nothing to switch on or off.</p>
      <div className="card mt-8 divide-y divide-sand">
        <div className="flex items-start justify-between gap-6 p-5">
          <div><h2 className="font-medium">Strictly necessary</h2><p className="mt-1 text-sm text-muted">Sign-in, security, your bag, currency and language. These cannot be turned off because the store would not work without them.</p></div>
          <span className="chip shrink-0 bg-ok/10 text-ok">Always on</span>
        </div>
        <div className="flex items-start justify-between gap-6 p-5">
          <div><h2 className="font-medium">Analytics & marketing</h2><p className="mt-1 text-sm text-muted">Not used on this store. If we add them in future we will ask for your consent first, and you'll be able to change your choice on this page.</p></div>
          <span className="chip shrink-0 bg-sand text-muted">Not used</span>
        </div>
      </div>
      <p className="mt-6 text-sm">Full details: <Link href="/policies/cookies" className="link">Cookie Policy</Link>.</p>
    </div>
  );
}
