"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileMenu({ links, labels }: { links: { href: string; label: string }[]; labels: { menu: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="btn-ghost -ms-3" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        <span className="sr-only">{labels.menu}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setOpen(false)} />
          <nav id="mobile-nav" className="absolute inset-y-0 start-0 flex w-[85%] max-w-sm flex-col bg-ivory p-6 shadow-xl">
            <button type="button" className="btn-ghost self-end" onClick={() => setOpen(false)} autoFocus>
              {labels.close} <span aria-hidden="true">✕</span>
            </button>
            <ul className="mt-4 space-y-1">
              {links.map((l) => (
                <li key={l.href}><Link href={l.href} className="block rounded-xl px-3 py-3 font-display text-2xl hover:bg-cream">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
