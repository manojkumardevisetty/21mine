import Link from "next/link";
import { logoutAction } from "@/app/actions/account";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Account settings" },
];

export function AccountShell({ title, active, children }: { title: string; active: string; children: React.ReactNode }) {
  return (
    <div className="container-x py-10">
      <h1 className="h-display text-4xl">{title}</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="min-w-0">
          <ul className="flex gap-2 overflow-x-auto md:flex-col">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} aria-current={active === n.href ? "page" : undefined}
                className={`block whitespace-nowrap rounded-xl px-4 py-2.5 text-sm ${active === n.href ? "bg-charcoal text-ivory" : "hover:bg-cream"}`}>{n.label}</Link></li>
            ))}
            <li><form action={logoutAction}><button className="w-full whitespace-nowrap rounded-xl px-4 py-2.5 text-start text-sm hover:bg-cream">Sign out</button></form></li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
