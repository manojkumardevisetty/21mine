"use server";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/ratelimit";
import { randomToken, sha256 } from "@/lib/tokens";
import { emailLayout, sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { addressSchema } from "@/lib/checkout";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const fieldErrors = (issues: z.core.$ZodIssue[]) => {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= i.message;
  return errors;
};
const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/account");

const password = z.string().min(10, "Use at least 10 characters").max(128)
  .regex(/[A-Za-z]/, "Include at least one letter").regex(/[0-9]/, "Include at least one number");

// ---------------- Sign in / out ----------------
export async function loginAction(_p: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const pass = String(fd.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!z.string().email().safeParse(email).success) errors.email = "Enter a valid email address";
  if (!pass) errors.password = "Enter your password";
  if (Object.keys(errors).length) return { ok: false, message: "Please check the highlighted fields.", errors };
  try {
    await signIn("credentials", { email, password: pass, redirectTo: safeNext(fd.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "rate_limited") return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes or reset your password." };
      return { ok: false, message: "Incorrect email or password." };
    }
    throw e; // NEXT_REDIRECT on success
  }
  return null;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------------- Register ----------------
const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(20).regex(/^$|^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number").optional(),
  password,
  confirm: z.string(),
  marketing: z.string().optional(),
  privacy: z.literal("on", { message: "Please confirm you have read the Privacy Policy" }),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function registerAction(_p: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (!(await rateLimit(`register:${d.email}`, 5, 3600))) return { ok: false, message: "Too many attempts. Please try again later." };
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, d.email), columns: { id: true } });
  if (exists) return { ok: false, message: "An account with this email already exists.", errors: { email: "This email is already registered. Sign in or reset your password." } };
  const marketing = d.marketing === "on";
  try {
    await db.insert(schema.users).values({
      email: d.email, name: d.name, phone: d.phone || null, passwordHash: await bcrypt.hash(d.password, 12),
      marketingOptIn: marketing, marketingOptInAt: marketing ? new Date() : null,
    });
  } catch (e) {
    if ((e as { code?: string; cause?: { code?: string } }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505")
      return { ok: false, message: "An account with this email already exists.", errors: { email: "This email is already registered." } };
    throw e;
  }
  await sendMail({
    to: d.email, subject: "Welcome to 21mine",
    text: `Hi ${d.name},\n\nYour 21mine account is ready. Sign in any time at ${env.appUrl}/account to track orders, download invoices and save addresses.\n\nIf you didn't create this account, contact support@21mine.shop.`,
    html: emailLayout("Welcome to 21mine", `<p>Hi ${d.name.replace(/</g, "&lt;")},</p><p>Your account is ready. You can track orders, download invoices and save delivery addresses.</p><p><a href="${env.appUrl}/account">Go to my account</a></p>`),
  });
  await signIn("credentials", { email: d.email, password: d.password, redirectTo: safeNext(fd.get("next")) });
  return null;
}

// ---------------- Password reset ----------------
export async function forgotPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: false, message: "Enter a valid email address", errors: { email: "Enter a valid email address" } };
  const generic: FormState = { ok: true, message: "If an account exists for that email, we've sent a link to reset your password. It expires in 60 minutes. Check your spam folder if you don't see it." };
  if (!(await rateLimit(`forgot:${email}`, 3, 3600))) return generic;
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) return generic;
  const token = randomToken(32);
  await db.insert(schema.passwordResetTokens).values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  const link = `${env.appUrl}/account/reset?token=${token}`;
  await sendMail({
    to: user.email, subject: "Reset your 21mine password",
    text: `Hi ${user.name},\n\nWe received a request to reset your password. Use this link within 60 minutes:\n${link}\n\nIf you didn't ask for this, you can ignore this email - your password won't change.`,
    html: emailLayout("Reset your password", `<p>Hi ${user.name.replace(/</g, "&lt;")},</p><p>Use the button below within 60 minutes to choose a new password.</p><p><a href="${link}" style="display:inline-block;background:#2B2B2B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Reset password</a></p><p style="font-size:13px;color:#777">If you didn't request this, ignore this email.</p>`),
  });
  return generic;
}

const resetSchema = z.object({ token: z.string().min(20), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function resetPasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  const { token, password: pw } = parsed.data;
  const done = await db.transaction(async (tx) => {
    const [t] = await tx.update(schema.passwordResetTokens).set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResetTokens.tokenHash, sha256(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())))
      .returning();
    if (!t) return null;
    const [u] = await tx.update(schema.users).set({ passwordHash: await bcrypt.hash(pw, 12), sessionVersion: sql`${schema.users.sessionVersion} + 1` })
      .where(eq(schema.users.id, t.userId)).returning();
    await tx.update(schema.passwordResetTokens).set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResetTokens.userId, t.userId), isNull(schema.passwordResetTokens.usedAt)));
    return u;
  });
  if (!done) return { ok: false, message: "This reset link is invalid or has expired. Please request a new one." };
  await sendMail({ to: done.email, subject: "Your 21mine password was changed", text: `Hi ${done.name},\n\nYour password was just changed and you've been signed out on all devices. If this wasn't you, contact support@21mine.shop immediately.` });
  return { ok: true, message: "Your password has been reset. You can now sign in with your new password." };
}

// ---------------- Account settings ----------------
const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().max(20).regex(/^$|^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
});

export async function updateProfileAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  await db.update(schema.users).set({ name: parsed.data.name, phone: parsed.data.phone || null }).where(eq(schema.users.id, user.id));
  revalidatePath("/account");
  return { ok: true, message: "Your details have been saved." };
}

export async function updateMarketingAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const on = fd.get("marketing") === "on";
  await db.update(schema.users).set({ marketingOptIn: on, marketingOptInAt: on ? new Date() : null }).where(eq(schema.users.id, user.id));
  revalidatePath("/account/settings");
  return { ok: true, message: on ? "You're subscribed to 21mine news and offers." : "You've been unsubscribed from marketing emails." };
}

const changePwSchema = z.object({ current: z.string().min(1, "Enter your current password"), password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePwSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  if (!(await rateLimit(`chpw:${user.id}`, 5, 900))) return { ok: false, message: "Too many attempts. Please wait 15 minutes." };
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!u || !(await bcrypt.compare(parsed.data.current, u.passwordHash))) return { ok: false, message: "Your current password is incorrect.", errors: { current: "Incorrect password" } };
  await db.update(schema.users).set({ passwordHash: await bcrypt.hash(parsed.data.password, 12), sessionVersion: sql`${schema.users.sessionVersion} + 1` }).where(eq(schema.users.id, u.id));
  await sendMail({ to: u.email, subject: "Your 21mine password was changed", text: `Hi ${u.name},\n\nYour password was changed. If this wasn't you, contact support@21mine.shop immediately.` });
  await signIn("credentials", { email: u.email, password: parsed.data.password, redirect: false });
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

export async function signOutEverywhereAction() {
  const user = await requireUser();
  await db.update(schema.users).set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` }).where(eq(schema.users.id, user.id));
  await signOut({ redirectTo: "/account/login?signedout=all" });
}

export async function requestDataAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = fd.get("kind") === "delete" ? "delete" : "export";
  if (!(await rateLimit(`datareq:${user.id}`, 3, 86400))) return { ok: false, message: "You've already sent a request today. We'll be in touch." };
  await sendMail({
    to: env.notifyEmail, replyTo: user.email,
    subject: `Privacy request (${kind === "delete" ? "account deletion" : "data copy"}) - ${user.email}`,
    text: `Customer ${user.name} <${user.email}> (user id ${user.id}) requested ${kind === "delete" ? "deletion of their account and personal data" : "a copy of their personal data"}. Respond within 30 days per the Privacy Policy.`,
  });
  await sendMail({ to: user.email, subject: "We've received your privacy request", text: `Hi ${user.name},\n\nWe've received your request for ${kind === "delete" ? "account deletion" : "a copy of your data"}. We'll respond within 30 days. Order and invoice records we must keep by law will be retained for the required period.\n\n21mine customer care` });
  return { ok: true, message: "Request sent. We'll email you within 30 days." };
}

// ---------------- Addresses ----------------
export async function saveAddressAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  const label = String(fd.get("label") ?? "Home").trim().slice(0, 30) || "Home";
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const id = String(fd.get("id") ?? "");
  const makeDefault = fd.get("isDefault") === "on";
  const values = {
    label, fullName: d.fullName, phone: d.phone, country: d.country, region: d.region, city: d.city,
    street: d.street || null, building: d.building, unit: d.unit || null, landmark: d.landmark || null, postalCode: d.postalCode || null,
  };
  const err = await db.transaction(async (tx): Promise<string | null> => {
    const count = await tx.$count(schema.addresses, eq(schema.addresses.userId, user.id));
    if (!id && count >= 10) return "You can save up to 10 addresses. Please delete one first.";
    if (makeDefault || count === 0) await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
    if (id) {
      const r = await tx.update(schema.addresses).set({ ...values, ...(makeDefault ? { isDefault: true } : {}) })
        .where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id))).returning({ id: schema.addresses.id });
      if (!r.length) { tx.rollback(); }
    } else {
      await tx.insert(schema.addresses).values({ ...values, userId: user.id, isDefault: makeDefault || count === 0 });
    }
    return null;
  }).catch(() => "This address could not be found.");
  if (err) return { ok: false, message: err };
  revalidatePath("/account/addresses");
  redirect("/account/addresses?saved=1");
}

export async function deleteAddressAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  await db.transaction(async (tx) => {
    const [del] = await tx.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id))).returning();
    if (del?.isDefault) {
      const next = await tx.query.addresses.findFirst({ where: and(eq(schema.addresses.userId, user.id), ne(schema.addresses.id, id)) });
      if (next) await tx.update(schema.addresses).set({ isDefault: true }).where(eq(schema.addresses.id, next.id));
    }
  });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  await db.transaction(async (tx) => {
    const own = await tx.query.addresses.findFirst({ where: and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)) });
    if (!own) return;
    await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
    await tx.update(schema.addresses).set({ isDefault: true }).where(eq(schema.addresses.id, id));
  });
  revalidatePath("/account/addresses");
}
