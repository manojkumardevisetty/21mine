"use client";
import { useRef } from "react";

export function AutoSubmitSelect({ action, name, value, label, options, className = "", idSuffix = "" }: {
  action: (fd: FormData) => Promise<void>; name: string; value: string; label: string;
  options: { value: string; label: string }[]; className?: string; idSuffix?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref} className={className}>
      <label className="sr-only" htmlFor={`sel-${name}${idSuffix}`}>{label}</label>
      <select id={`sel-${name}${idSuffix}`} name={name} defaultValue={value} onChange={() => ref.current?.requestSubmit()}
        className="rounded-full border border-sand bg-transparent py-1.5 ps-3 pe-7 text-xs font-medium focus:border-rose-deep">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <noscript><button type="submit" className="ms-1 text-xs underline">OK</button></noscript>
    </form>
  );
}
