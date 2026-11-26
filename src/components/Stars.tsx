export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5 text-gold" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = full >= i ? 1 : full >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <defs><linearGradient id={`s${i}-${fill}`}><stop offset={`${fill * 100}%`} stopColor="currentColor" /><stop offset={`${fill * 100}%`} stopColor="#E7DED3" /></linearGradient></defs>
            <path fill={`url(#s${i}-${fill})`} d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
          </svg>
        );
      })}
    </span>
  );
}
