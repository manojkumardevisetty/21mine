// Accepted-payment pills (simple wordmarks, not official logos).
const PILLS: { key: string; node: React.ReactNode }[] = [
  { key: "visa", node: <span className="font-display text-[13px] font-extrabold italic tracking-tight text-[#1A1F71]">VISA</span> },
  { key: "mc", node: <span className="flex items-center" aria-label="Mastercard"><span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" /><span className="-ms-1.5 h-3.5 w-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" /></span> },
  { key: "apple", node: <span className="flex items-center gap-1 text-[13px] font-semibold text-black"><svg width="11" height="13" viewBox="0 0 14 17" aria-hidden="true"><path fill="currentColor" d="M11.6 9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7C3.5 4.5 2.2 5.3 1.5 6.6c-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4 0 0-2.5-.9-2.5-3.7ZM9.6 3c.6-.7 1-1.6.8-2.6-.8 0-1.8.6-2.4 1.3-.5.6-1 1.6-.9 2.5.9.1 1.9-.5 2.5-1.2Z" /></svg>Pay</span> },
  { key: "google", node: <span className="flex items-center gap-1 text-[13px] font-medium text-[#3C4043]"><span className="font-bold"><span className="text-[#4285F4]">G</span></span>Pay</span> },
];

export function PaymentPills({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Accepted payment methods">
      {PILLS.map((p) => (
        <li key={p.key} className="grid h-9 min-w-[64px] flex-1 place-items-center rounded-lg border border-sand bg-white px-3 sm:max-w-[150px]">{p.node}</li>
      ))}
    </ul>
  );
}
