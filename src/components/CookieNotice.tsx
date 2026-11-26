import Link from "next/link";
import { cookies } from "next/headers";
import { dismissCookieNotice } from "@/app/actions/prefs";

// Essential-only notice (no tracking is used, so no consent gate is required).
export async function CookieNotice() {
  if ((await cookies()).get("cookie_notice")) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:end-4 sm:max-w-sm">
      <form action={dismissCookieNotice} className="card bg-white p-4 text-sm shadow-lg">
        <p>We use only essential cookies to keep you signed in, remember your bag and your currency. No tracking or advertising cookies. <Link href="/policies/cookies" className="link">Cookie Policy</Link></p>
        <button type="submit" className="btn-primary btn-sm mt-3">OK, got it</button>
      </form>
    </div>
  );
}
