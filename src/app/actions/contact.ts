"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";

export type ContactState = { ok: boolean; message: string; errors?: Record<string, string> } | null;
const s = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(20).regex(/^$|^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number").optional(),
  orderRef: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(3000),
  website: z.string().max(0).optional(), // honeypot
});

export async function contactAction(_p: ContactState, fd: FormData): Promise<ContactState> {
  const parsed = s.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    if (errors.website) return { ok: true, message: "Thanks - your message has been sent." };
    return { ok: false, message: "Please check the highlighted fields.", errors };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`contact:${ip}`, 5, 3600)) || !(await rateLimit(`contact:${parsed.data.email}`, 5, 3600)))
    return { ok: false, message: "You've sent several messages recently. Please wait a while or email support@21mine.shop." };
  const d = parsed.data;
  await db.insert(schema.contactMessages).values({ name: d.name, email: d.email, phone: d.phone || null, orderRef: d.orderRef || null, message: d.message });
  await sendMail({ to: "support@21mine.shop", replyTo: d.email, subject: `Contact form: ${d.name}${d.orderRef ? ` (order ${d.orderRef})` : ""}`,
    text: `From: ${d.name} <${d.email}>${d.phone ? `\nPhone: ${d.phone}` : ""}${d.orderRef ? `\nOrder: ${d.orderRef}` : ""}\n\n${d.message}\n\nAdmin: ${env.appUrl}/admin/messages` });
  await sendMail({ to: d.email, subject: "We've received your message - 21mine", text: `Hi ${d.name},\n\nThanks for contacting 21mine. Our team replies within 1 business day (Sunday-Friday).\n\nYour message:\n${d.message}\n\n21mine customer care\nsupport@21mine.shop` });
  return { ok: true, message: "Thanks - your message has been sent. We've emailed you a copy and will reply within 1 business day." };
}
