"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileMenu({ groups, labels, prefs }: { groups: { title: string; links: { href: string; label: string }[] }[]; labels: { menu: string; close: string }; prefs?: React.ReactNode }) {
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
      <button type="button" className="btn-icon" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)} aria-label={labels.menu}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] animate-fade-in" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setOpen(false)} />
          <nav id="mobile-nav" className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <button type="button" className="btn-icon self-end" onClick={() => setOpen(false)} autoFocus aria-label={labels.close}>✕</button>
            {prefs && <div className="mt-2 rounded-2xl border border-sand p-4">{prefs}</div>}
            {groups.map((g) => (
              <div key={g.title} className="mt-4">
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-faint">{g.title}</p>
                <ul>{g.links.map((l) => <li key={l.href}><Link href={l.href} className="block rounded-xl px-2 py-2.5 font-display text-[17px] font-semibold text-charcoal hover:bg-ivory">{l.label}</Link></li>)}</ul>
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
