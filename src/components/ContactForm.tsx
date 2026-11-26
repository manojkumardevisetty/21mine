"use client";
import { StatefulForm } from "./StatefulForm";
import { useActionState } from "react";
import { contactAction } from "@/app/actions/contact";
import { Alert, Field, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";

export function ContactForm({ email = "", name = "" }: { email?: string; name?: string }) {
  const [s, a] = useActionState(contactAction, null);
  if (s?.ok) return <Alert kind="success">{s.message}</Alert>;
  const e = s?.errors ?? {};
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      {s && <Alert kind="error">{s.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={name} autoComplete="name" error={e.name} required />
        <Field label="Email" name="email" type="email" defaultValue={email} autoComplete="email" error={e.email} required />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} optional />
        <Field label="Order number" name="orderRef" placeholder="21M-26…" error={e.orderRef} optional />
      </div>
      <TextArea label="Message" name="message" rows={6} error={e.message} required />
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </StatefulForm>
  );
}
