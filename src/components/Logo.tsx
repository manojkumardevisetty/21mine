export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="21mine">
      <svg viewBox="0 0 42 46" className="h-8 w-8 shrink-0" aria-hidden="true">
        <g fill="none" stroke="#B86633" strokeWidth="2.6" strokeLinejoin="round">
          <path d="M4 14 L11 5 H31 L38 14 L21 42 Z" />
          <path d="M4 14 H38 M11 5 L16 14 L21 42 L26 14 L31 5" />
        </g>
      </svg>
      <span className="flex flex-col leading-none" dir="ltr">
        <span className={`font-display text-[1.35rem] font-bold tracking-[-0.02em] ${light ? "text-white" : "text-charcoal"}`}>21<span className="text-rose">mine</span></span>
        <span className={`mt-0.5 text-[0.62rem] font-medium uppercase tracking-[0.22em] ${light ? "text-white/60" : "text-faint"}`}>Dubai</span>
      </span>
    </span>
  );
}
