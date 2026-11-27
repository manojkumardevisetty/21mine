"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function AnnouncementBar({ text }: { text: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem("ann-closed")) setHidden(true); } catch {} }, []);
  if (hidden || !text) return null;
  return (
    <div className="relative bg-charcoal px-10 py-2.5 text-center text-[13px] font-medium text-white">
      {text}
      <button className="absolute end-3 top-1/2 -translate-y-1/2 px-2 text-white/80 hover:text-white" aria-label="Close announcement"
        onClick={() => { setHidden(true); try { sessionStorage.setItem("ann-closed", "1"); } catch {} }}>✕</button>
    </div>
  );
}

export function NavDropdown({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  return (
    <li ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="flex items-center gap-1 py-2 text-sm text-ink hover:text-charcoal" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
        {label}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`transition ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className={`absolute start-1/2 top-full z-50 -translate-x-1/2 pt-3 rtl:translate-x-1/2 ${wide ? "w-[560px]" : "w-60"}`}>
          <div className="rounded-2xl border border-sand bg-white p-4 shadow-xl animate-pop-in">{children}</div>
        </div>
      )}
    </li>
  );
}

export function PrefsMenu({ currency, currencies, locale, setCurrency, setLocale, inline = false }: {
  currency: string; currencies: { code: string; name: string }[]; locale: string;
  setCurrency: (fd: FormData) => Promise<void>; setLocale: (fd: FormData) => Promise<void>; inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  const panel = (
    <>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Currency</p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3">
        {currencies.map((c) => (
          <form key={c.code} action={setCurrency}>
            <input type="hidden" name="currency" value={c.code} />
            <button className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold ${c.code === currency ? "border-charcoal bg-charcoal text-white" : "border-sand hover:border-charcoal/50"}`} data-currency={c.code} title={c.name} aria-pressed={c.code === currency}>{c.code}</button>
          </form>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-faint">Language</p>
      <div className="grid grid-cols-2 gap-1.5">
        {[["en", "English"], ["ar", "العربية"]].map(([v, l]) => (
          <form key={v} action={setLocale}><input type="hidden" name="locale" value={v} />
            <button className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold ${v === locale ? "border-charcoal bg-charcoal text-white" : "border-sand hover:border-charcoal/50"}`} data-locale={v} aria-pressed={v === locale}>{l}</button>
          </form>
        ))}
      </div>
    </>
  );
  if (inline) return <div>{panel}</div>;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Currency: ${currency}. Change currency or language`}
        className="flex h-11 items-center gap-1.5 rounded-full border border-sand bg-white px-3.5 text-sm font-semibold text-charcoal shadow-sm hover:border-charcoal/40">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
        {currency}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-sand bg-white p-4 shadow-xl animate-pop-in">{panel}</div>
      )}
    </div>
  );
}

export function NavLink({ href, children, accent = false }: { href: string; children: React.ReactNode; accent?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;
  return <Link href={href} aria-current={active ? "page" : undefined} className={`py-2 text-sm ${accent ? "font-medium text-rose hover:text-rose-deep" : "text-ink hover:text-charcoal"} ${active ? "font-semibold text-charcoal" : ""}`}>{children}</Link>;
}
