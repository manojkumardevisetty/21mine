"use client";
import { StatefulForm } from "../StatefulForm";
import Link from "next/link";
import { useActionState } from "react";
import {
  changePasswordAction, forgotPasswordAction, loginAction, registerAction, requestDataAction,
  resetPasswordAction, saveAddressAction, updateMarketingAction, updateProfileAction, type FormState,
} from "@/app/actions/account";
import { Alert, Field, SelectField } from "../Field";
import { SubmitButton } from "../SubmitButton";
import { useState } from "react";

const Msg = ({ s }: { s: FormState }) => (s ? <Alert kind={s.ok ? "success" : "error"}>{s.message}</Alert> : null);

export function LoginForm({ next }: { next: string }) {
  const [s, a] = useActionState(loginAction, null);
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      <Msg s={s} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={s?.errors?.email} required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={s?.errors?.password} required />
      <div className="flex justify-end"><Link href="/account/forgot" className="link text-sm">Forgot password?</Link></div>
      <SubmitButton className="btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </StatefulForm>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [s, a] = useActionState(registerAction, null);
  const e = s?.errors ?? {};
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      <Msg s={s} />
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" name="name" autoComplete="name" error={e.name} required />
      <Field label="Email" name="email" type="email" autoComplete="email" error={e.email} required />
      <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" error={e.phone} optional />
      <Field label="Password" name="password" type="password" autoComplete="new-password" error={e.password} hint="At least 10 characters, with a letter and a number" required />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" error={e.confirm} required />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="privacy" className="mt-0.5 h-4 w-4 accent-[#2B2B2B]" aria-invalid={e.privacy ? true : undefined} />
        <span>I have read the <Link href="/policies/privacy" target="_blank" className="link">Privacy Policy</Link> and agree to the <Link href="/policies/terms" target="_blank" className="link">Terms of Sale</Link>.</span>
      </label>
      {e.privacy && <p className="field-error" role="alert">{e.privacy}</p>}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-[#2B2B2B]" />
        <span>Email me about new launches and offers (optional - you can unsubscribe any time).</span>
      </label>
      <SubmitButton className="btn-primary w-full" pendingText="Creating account…">Create account</SubmitButton>
    </StatefulForm>
  );
}

export function ForgotForm() {
  const [s, a] = useActionState(forgotPasswordAction, null);
  if (s?.ok) return <Alert kind="success">{s.message}</Alert>;
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      <Msg s={s} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={s?.errors?.email} required />
      <SubmitButton className="btn-primary w-full" pendingText="Sending…">Send reset link</SubmitButton>
    </StatefulForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, a] = useActionState(resetPasswordAction, null);
  if (s?.ok) return <div className="space-y-4"><Alert kind="success">{s.message}</Alert><Link href="/account/login" className="btn-primary w-full">Sign in</Link></div>;
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      <Msg s={s} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" error={s?.errors?.password} hint="At least 10 characters, with a letter and a number" required />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={s?.errors?.confirm} required />
      <SubmitButton className="btn-primary w-full" pendingText="Saving…">Set new password</SubmitButton>
    </StatefulForm>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [s, a] = useActionState(updateProfileAction, null);
  return (
    <StatefulForm action={a} className="space-y-4" noValidate>
      <Msg s={s} />
      <Field label="Email" name="emailDisplay" value={email} disabled hint="Contact support to change your email address" />
      <Field label="Full name" name="name" defaultValue={name} autoComplete="name" error={s?.errors?.name} required />
      <Field label="Mobile number" name="phone" type="tel" defaultValue={phone} autoComplete="tel" error={s?.errors?.phone} optional />
      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </StatefulForm>
  );
}

export function MarketingForm({ on }: { on: boolean }) {
  const [s, a] = useActionState(updateMarketingAction, null);
  return (
    <StatefulForm action={a} className="space-y-3">
      <Msg s={s} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" defaultChecked={on} className="mt-0.5 h-4 w-4 accent-[#2B2B2B]" /> Email me about new launches and offers</label>
      <SubmitButton className="btn-secondary btn-sm" pendingText="Saving…">Save preference</SubmitButton>
    </StatefulForm>
  );
}

export function PasswordForm() {
  const [s, a] = useActionState(changePasswordAction, null);
  return (
    <StatefulForm action={a} className="space-y-4" noValidate key={s?.ok ? "done" : "form"}>
      <Msg s={s} />
      <Field label="Current password" name="current" type="password" autoComplete="current-password" error={s?.errors?.current} required />
      <Field label="New password" name="password" type="password" autoComplete="new-password" error={s?.errors?.password} hint="At least 10 characters, with a letter and a number" required />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={s?.errors?.confirm} required />
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </StatefulForm>
  );
}

export function DataRequestForm() {
  const [s, a] = useActionState(requestDataAction, null);
  return (
    <div className="space-y-3">
      <Msg s={s} />
      <div className="flex flex-wrap gap-2">
        <StatefulForm action={a}><input type="hidden" name="kind" value="export" /><SubmitButton className="btn-secondary btn-sm" pendingText="Sending…">Request a copy of my data</SubmitButton></StatefulForm>
        <StatefulForm action={a} onSubmit={(e) => { if (!confirm("Request deletion of your account and personal data?")) e.preventDefault(); }}><input type="hidden" name="kind" value="delete" /><SubmitButton className="btn-ghost btn-sm text-danger" pendingText="Sending…">Request account deletion</SubmitButton></StatefulForm>
      </div>
    </div>
  );
}

type Addr = { id?: string; label?: string; fullName?: string; phone?: string; country?: string; region?: string; city?: string; street?: string | null; building?: string; unit?: string | null; landmark?: string | null; postalCode?: string | null; isDefault?: boolean };

export function AddressForm({ a: init, countries, emirates }: { a?: Addr; countries: { code: string; name: string; postal: boolean }[]; emirates: readonly string[] }) {
  const [s, act] = useActionState(saveAddressAction, null);
  const [country, setCountry] = useState(init?.country ?? "AE");
  const e = s?.errors ?? {};
  const isUAE = country === "AE";
  const postal = countries.find((c) => c.code === country)?.postal;
  return (
    <StatefulForm action={act} className="space-y-4" noValidate>
      <Msg s={s} />
      {init?.id && <input type="hidden" name="id" value={init.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" name="label" defaultValue={init?.label ?? "Home"} hint="e.g. Home, Office" />
        <Field label="Full name" name="fullName" defaultValue={init?.fullName} error={e.fullName} required />
        <Field label="Mobile number" name="phone" type="tel" defaultValue={init?.phone ?? (isUAE ? "+971 " : "")} error={e.phone} required />
        <SelectField label="Country" name="country" value={country} onChange={(ev) => setCountry(ev.target.value)} error={e.country}>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </SelectField>
        {isUAE ? (
          <SelectField label="Emirate" name="region" defaultValue={init?.region ?? ""} error={e.region}>
            <option value="">Select emirate</option>
            {emirates.map((x) => <option key={x}>{x}</option>)}
          </SelectField>
        ) : <Field label="State / province / region" name="region" defaultValue={init?.region} error={e.region} required />}
        <Field label={isUAE ? "Area / community" : "City / town"} name="city" defaultValue={init?.city} error={e.city} required />
        <Field label="Street" name="street" defaultValue={init?.street ?? ""} optional />
        <Field label={isUAE ? "Building or villa name / number" : "Address line 1"} name="building" defaultValue={init?.building} error={e.building} required />
        <Field label="Apartment / unit" name="unit" defaultValue={init?.unit ?? ""} optional />
        <Field label="Nearby landmark" name="landmark" defaultValue={init?.landmark ?? ""} optional />
        {postal && <Field label="Postal / ZIP code" name="postalCode" defaultValue={init?.postalCode ?? ""} error={e.postalCode} required />}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={init?.isDefault} className="h-4 w-4 accent-[#2B2B2B]" /> Use as my default address</label>
      <div className="flex gap-2"><SubmitButton pendingText="Saving…">Save address</SubmitButton><Link href="/account/addresses" className="btn-ghost">Cancel</Link></div>
    </StatefulForm>
  );
}
