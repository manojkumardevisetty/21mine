type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string; optional?: boolean };

export function Field({ label, name, error, hint, optional, id, ...rest }: Props) {
  const fid = id ?? `f-${name}`;
  const describedBy = [error ? `${fid}-err` : "", hint ? `${fid}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</label>
      <input id={fid} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
      {hint && !error && <p id={`${fid}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function SelectField({ label, name, error, children, id, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; error?: string }) {
  const fid = id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}</label>
      <select id={fid} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : undefined} {...rest}>{children}</select>
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function TextArea({ label, name, error, id, optional, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string; optional?: boolean }) {
  const fid = id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}{optional && <span className="font-normal text-muted"> (optional)</span>}</label>
      <textarea id={fid} name={name} className="input min-h-28" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : undefined} {...rest} />
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function Alert({ kind = "info", children, title }: { kind?: "info" | "error" | "success" | "warn"; children: React.ReactNode; title?: string }) {
  const cls = {
    info: "border-sand bg-cream text-charcoal", error: "border-danger/30 bg-danger/5 text-danger",
    success: "border-ok/30 bg-ok/5 text-ok", warn: "border-warn/30 bg-[#FBF3E4] text-warn",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
