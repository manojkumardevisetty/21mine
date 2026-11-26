import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/authz";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/account";
import { isDemo } from "@/lib/env";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | 21mine Admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; admin?: boolean }[] = [
  { href: "/admin", label: "Dashboard" }, { href: "/admin/orders", label: "Orders" }, { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" }, { href: "/admin/discounts", label: "Discounts" }, { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/customers", label: "Customers" }, { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Store settings", admin: true }, { href: "/admin/currencies", label: "Currencies", admin: true },
  { href: "/admin/policies", label: "Policies", admin: true }, { href: "/admin/outbox", label: "Email outbox" }, { href: "/admin/audit", label: "Audit log", admin: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireStaff();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-e border-sand bg-white/60 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between p-5"><Link href="/admin"><Logo /></Link><span className="chip bg-charcoal text-ivory">{u.role}</span></div>
        <nav aria-label="Admin"><ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {NAV.filter((n) => !n.admin || u.role === "ADMIN").map((n) => <li key={n.href}><Link href={n.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-cream">{n.label}</Link></li>)}
        </ul></nav>
        <div className="hidden space-y-2 border-t border-sand p-4 text-xs text-muted lg:block">
          <p>{u.email}</p>
          <Link href="/" className="link block">View store</Link>
          <form action={logoutAction}><button className="link">Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        {isDemo() && <div className="bg-rose-deep px-4 py-1.5 text-center text-xs text-white">Demo mode - simulated payments. Set STORE_MODE=production and connect a gateway before launch.</div>}
        <div className="p-4 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
