"use client";
import { StatefulForm } from "../StatefulForm";
import { useActionState, useEffect, useRef } from "react";
import type { AdminState } from "@/app/admin/actions";
import { SubmitButton } from "../SubmitButton";

export function ActionForm({ action, children, submit = "Save", pending = "Saving…", className = "space-y-4", reset = false, submitClass = "btn-primary btn-sm", confirmText }: {
  action: (p: AdminState, fd: FormData) => Promise<AdminState>; children: React.ReactNode; submit?: string; pending?: string;
  className?: string; reset?: boolean; submitClass?: string; confirmText?: string;
}) {
  const [s, a] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok && reset) ref.current?.reset(); }, [s, reset]);
  return (
    <StatefulForm ref={ref} action={a} className={className} onSubmit={(e) => { if (confirmText && !confirm(confirmText)) e.preventDefault(); }}>
      {s && (
        <div role={s.ok ? "status" : "alert"} className={`rounded-xl border px-3 py-2 text-sm ${s.ok ? "border-ok/30 bg-ok/5 text-ok" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {s.message}
          {s.errors && Object.keys(s.errors).length > 0 && (
            <ul className="mt-1 list-disc ps-5 text-xs">{Object.entries(s.errors).map(([k, v]) => <li key={k}><strong>{k}</strong>: {v}</li>)}</ul>
          )}
        </div>
      )}
      {children}
      <SubmitButton className={submitClass} pendingText={pending}>{submit}</SubmitButton>
    </StatefulForm>
  );
}
