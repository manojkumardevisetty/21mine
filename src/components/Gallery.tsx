"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function Gallery({ images }: { images: { url: string; alt: string }[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(images.length - 1, i));
    const slide = el.children[n] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setIndex(n);
  }, [images.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setIndex(Number((e.target as HTMLElement).dataset.i));
    }, { root: el, threshold: [0.6] });
    Array.from(el.children).forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [images.length]);

  if (images.length === 0) return <div className="aspect-[4/5] rounded-3xl bg-cream" />;
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[84px_1fr] lg:gap-4" aria-roledescription="carousel" aria-label="Product images">
      <div className="order-2 lg:order-1">
        <ul className="mt-3 flex gap-2 overflow-x-auto lg:mt-0 lg:flex-col" aria-label="Choose image">
          {images.map((im, i) => (
            <li key={im.url} className="shrink-0">
              <button type="button" onClick={() => go(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-current={i === index}
                className={`block w-16 overflow-hidden rounded-xl border-2 lg:w-20 ${i === index ? "border-charcoal" : "border-transparent opacity-70 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="aspect-[4/5] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative order-1 lg:order-2">
        <div ref={track} tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") go(index + (document.dir === "rtl" ? -1 : 1)); if (e.key === "ArrowLeft") go(index + (document.dir === "rtl" ? 1 : -1)); }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-cream [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((im, i) => (
            <div key={im.url} data-i={i} className="w-full shrink-0 snap-center" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={im.alt} className="aspect-[4/5] w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous image"
              className="absolute start-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-30 sm:grid">
              <span aria-hidden="true" className="rtl:rotate-180">‹</span>
            </button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === images.length - 1} aria-label="Next image"
              className="absolute end-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-30 sm:grid">
              <span aria-hidden="true" className="rtl:rotate-180">›</span>
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
              {images.map((im, i) => <span key={im.url} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-charcoal" : "w-1.5 bg-charcoal/30"}`} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
