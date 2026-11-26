"use client";
import { useContext } from "react";
import { useFormStatus } from "react-dom";
import { PendingContext } from "./StatefulForm";

export function SubmitButton({ children, pendingText, className = "btn-primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {pending ? (pendingText ?? "Please wait…") : children}
    </button>
  );
}
