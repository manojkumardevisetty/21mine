import nodemailer from "nodemailer";
import { db, schema } from "@/db";
import { env } from "./env";

export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Sends an email via SMTP. Without SMTP (local/demo) the message is stored in the
 * Outbox (Admin > Email outbox) so flows like password reset can still be tested.
 * Never throws: email failure must not break checkout.
 */
export async function sendMail(m: Mail): Promise<{ delivered: boolean }> {
  const t = getTransport();
  try {
    if (t) {
      await t.sendMail({ from: env.mailFrom, to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo });
      await db.insert(schema.outboxEmails).values({ to: m.to, subject: `[sent] ${m.subject}`, body: m.text });
      return { delivered: true };
    }
  } catch (e) {
    console.error("[mail] SMTP send failed", e);
    await db.insert(schema.outboxEmails).values({ to: m.to, subject: `[FAILED] ${m.subject}`, body: m.text }).catch(() => {});
    return { delivered: false };
  }
  await db.insert(schema.outboxEmails).values({ to: m.to, subject: m.subject, body: m.text }).catch(() => {});
  return { delivered: false };
}

export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#FAF6F0;font-family:Arial,sans-serif;color:#2B2B2B">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="font-family:Georgia,serif;font-size:28px;letter-spacing:1px;margin-bottom:24px">21<span style="color:#B07A7A">mine</span></div>
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px">${title}</h1>
${bodyHtml}
<p style="margin-top:32px;font-size:12px;color:#6b6b6b">21mine · support@21mine.shop · ${env.appUrl}</p>
</div></body></html>`;
}
