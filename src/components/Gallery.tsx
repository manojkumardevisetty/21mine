"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function Gallery({ images, fill = false }: { images: { url: string; alt: string }[]; fill?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(images.length - 1, i));
    const slide = el.children[n] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: "smooth" });
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

  if (images.length === 0) return <div className="aspect-square rounded-2xl bg-cream" />;
  const slideCls = fill ? "aspect-square w-full object-cover lg:aspect-auto lg:h-full" : "aspect-square w-full object-cover";
  return (
    <div className={`relative ${fill ? "lg:h-full" : ""}`} aria-roledescription="carousel" aria-label="Product images">
      <div ref={track} tabIndex={0}
        onKeyDown={(e) => { const r = document.dir === "rtl" ? -1 : 1; if (e.key === "ArrowRight") go(index + r); if (e.key === "ArrowLeft") go(index - r); }}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-cream ${fill ? "rounded-2xl lg:h-full lg:rounded-none" : "rounded-2xl"}`}>
        {images.map((im, i) => (
          <div key={im.url} data-i={i} className={`w-full shrink-0 snap-center ${fill ? "lg:h-full" : ""}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.url} alt={im.alt} className={slideCls} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous image" className="btn-icon absolute start-3 top-1/2 h-10 w-10 -translate-y-1/2 disabled:opacity-0"><span className="rtl:rotate-180">‹</span></button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === images.length - 1} aria-label="Next image" className="btn-icon absolute end-3 top-1/2 h-10 w-10 -translate-y-1/2 disabled:opacity-0"><span className="rtl:rotate-180">›</span></button>
          <ul className="absolute inset-x-0 bottom-3 flex justify-center gap-2 px-3" aria-label="Choose image">
            {images.map((im, i) => (
              <li key={im.url}>
                <button type="button" onClick={() => go(i)} aria-label={`Show image ${i + 1} of ${images.length}`} aria-current={i === index}
                  className={`block overflow-hidden rounded-lg border-2 bg-white shadow transition ${i === index ? "border-charcoal" : "border-white/80 opacity-80 hover:opacity-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-11 w-11 object-cover sm:h-14 sm:w-14" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
