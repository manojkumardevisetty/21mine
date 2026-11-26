export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="21mine">
      <svg viewBox="0 0 42 52" className="h-7 w-6 shrink-0" aria-hidden="true">
        <g fill="none" stroke="#B07A7A" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M4 16 L11 7 H31 L38 16 L21 47 Z" />
          <path d="M4 16 H38 M11 7 L16 16 L21 47 L26 16 L31 7" />
        </g>
      </svg>
      <span className={`font-display text-[1.9rem] leading-none tracking-wide ${light ? "text-ivory" : "text-charcoal"}`} dir="ltr">
        21<em className="text-rose not-italic font-display italic">mine</em>
      </span>
    </span>
  );
}
