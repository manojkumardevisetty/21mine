import Link from "next/link";
import { getSettings } from "@/lib/settings";

// Distraction-free checkout: no store navigation, just the brand and a way back.
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="min-h-screen bg-ivory">
      <a href="#main" className="skip-link btn-primary btn-sm">Skip to content</a>
      <main id="main">{children}</main>
      <footer className="border-t border-sand bg-ivory py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} {s.legalName ?? s.brandName} · <Link href="/policies/terms" className="hover:underline">Terms</Link> · <Link href="/policies/privacy" className="hover:underline">Privacy</Link> · <Link href="/policies/returns" className="hover:underline">Returns</Link> · <a href={`mailto:${s.supportEmail}`} className="hover:underline">{s.supportEmail}</a>
      </footer>
    </div>
  );
}

