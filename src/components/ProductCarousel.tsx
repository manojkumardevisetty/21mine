"use client";
import { useRef, useState } from "react";

/** Horizontal, swipeable product rail with optional tabs and arrow controls. */
export function ProductCarousel({ title, tabs }: { title: React.ReactNode; tabs: { key: string; label: string; content: React.ReactNode[] }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const rail = useRef<HTMLUListElement>(null);
  const items = tabs.find((t) => t.key === active)?.content ?? [];
  const scroll = (dir: 1 | -1) => {
    const el = rail.current; if (!el) return;
    const rtl = document.dir === "rtl" ? -1 : 1;
    el.scrollBy({ left: dir * rtl * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className="container-x py-14 sm:py-20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="section-title max-w-md">{title}</h2>
        <div className="flex items-center gap-2">
          {tabs.length > 1 && (
            <div role="tablist" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-sand bg-white p-1 shadow-sm">
              {tabs.map((t) => (
                <button key={t.key} role="tab" aria-selected={t.key === active} onClick={() => { setActive(t.key); rail.current?.scrollTo({ left: 0 }); }}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${t.key === active ? "border border-charcoal text-charcoal" : "border border-transparent text-muted hover:text-charcoal"}`}>
                  {t.key === active && <span className="h-1.5 w-1.5 rounded-full bg-rose" aria-hidden="true" />}{t.label}
                </button>
              ))}
            </div>
          )}
          <div className="hidden gap-2 md:flex">
            <button className="btn-icon h-10 w-10" onClick={() => scroll(-1)} aria-label="Previous products"><span className="rtl:rotate-180">←</span></button>
            <button className="btn-icon h-10 w-10" onClick={() => scroll(1)} aria-label="Next products"><span className="rtl:rotate-180">→</span></button>
          </div>
        </div>
      </div>
      <ul ref={rail} className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {items.map((c, i) => <li key={i} className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[23.5%]">{c}</li>)}
      </ul>
    </section>
  );
}
