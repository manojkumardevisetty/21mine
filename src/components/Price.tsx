import { convertFils, formatMinor, type CurrencyInfo } from "@/lib/money";

export function Price({ fils, currency, compareAtFils, className = "", locale = "en" }: {
  fils: number; currency: CurrencyInfo; compareAtFils?: number | null; className?: string; locale?: string;
}) {
  const v = formatMinor(convertFils(fils, currency), currency.code, currency.exponent, locale);
  return (
    <span className={className}>
      <span>{v}</span>
      {compareAtFils && compareAtFils > fils ? (
        <>
          {" "}<s className="text-muted text-[0.85em]" aria-label="Original price">{formatMinor(convertFils(compareAtFils, currency), currency.code, currency.exponent, locale)}</s>
        </>
      ) : null}
    </span>
  );
}

export function Money({ minor, code, exponent = 2, className = "" }: { minor: number; code: string; exponent?: number; className?: string }) {
  return <span className={className}>{formatMinor(minor, code, exponent)}</span>;
}
