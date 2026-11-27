// Floating-label fields used on the checkout (label sits inside the input, moves up when filled).
type Base = { label: string; name: string; error?: string; hint?: string; optional?: boolean };

export function FloatInput({ label, name, error, hint, optional, id, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & Base) {
  const fid = id ?? `f-${name}`;
  const desc = [error ? `${fid}-err` : "", hint && !error ? `${fid}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <div className="float-field">
        <input id={fid} name={name} placeholder=" " className="input" aria-invalid={error ? true : undefined} aria-describedby={desc} {...rest} />
        <label htmlFor={fid}>{label}{optional && " (optional)"}</label>
      </div>
      {hint && !error && <p id={`${fid}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function FloatSelect({ label, name, error, id, className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & Base) {
  const fid = id ?? `f-${name}`;
  return (
    <div className={className}>
      <div className="float-field">
        <select id={fid} name={name} className="input appearance-none pe-9" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : undefined} {...rest}>{children}</select>
        <label htmlFor={fid}>{label}</label>
        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
