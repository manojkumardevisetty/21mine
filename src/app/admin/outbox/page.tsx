import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";

export const metadata = { title: "Email outbox" };
export default async function Outbox() {
  await requireStaff();
  const list = await db.select().from(schema.outboxEmails).orderBy(desc(schema.outboxEmails.createdAt)).limit(100);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="h-display text-4xl">Email outbox</h1>
      <p className="text-sm text-muted">{process.env.SMTP_HOST ? "SMTP is configured: emails are delivered and logged here." : "SMTP is not configured: emails are NOT delivered - they are stored here so you can test flows. Configure SMTP_* before launch."}</p>
      {list.map((m) => (
        <details key={m.id} className="card p-4">
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> → {m.to} <span className="text-xs text-muted">{m.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</span></summary>
          <pre className="mt-3 whitespace-pre-wrap break-words text-xs">{m.body}</pre>
        </details>
      ))}
      {list.length === 0 && <p className="text-muted">No emails yet.</p>}
    </div>
  );
}
