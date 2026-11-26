"use client";
import { createContext, forwardRef, useTransition } from "react";

export const PendingContext = createContext(false);

/**
 * <form> that submits through a useActionState dispatcher inside a transition, so React does NOT
 * reset the user's input when the server returns validation errors. Without JS it falls back to
 * the native progressive-enhanced form action.
 */
export const StatefulForm = forwardRef<HTMLFormElement, Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & { action: (fd: FormData) => void }>(
  function StatefulForm({ action, onSubmit, children, ...rest }, ref) {
    const [pending, start] = useTransition();
    return (
      <PendingContext.Provider value={pending}>
        <form
          ref={ref}
          {...rest}
          action={action}
          aria-busy={pending || undefined}
          onSubmit={(e) => {
            onSubmit?.(e);
            if (e.defaultPrevented) return;
            e.preventDefault();
            if (pending) return; // ignore repeated submits while one is in flight
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
            const fd = new FormData(e.currentTarget, submitter);
            start(() => action(fd));
          }}
        >
          {children}
        </form>
      </PendingContext.Provider>
    );
  },
);
