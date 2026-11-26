import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";
import { markMessagesAction } from "../actions";

export const metadata = { title: "Messages" };
export default async function Messages() {
  await requireStaff();
  const list = await db.select().from(schema.contactMessages).orderBy(eq(schema.contactMessages.handled, true), desc(schema.contactMessages.createdAt)).limit(200);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="h-display text-4xl">Contact messages</h1>
      {list.length === 0 && <p className="text-muted">No messages yet.</p>}
      {list.map((m) => (
        <article key={m.id} className={`card p-5 ${m.handled ? "opacity-60" : ""}`}>
          <p className="text-sm"><strong>{m.name}</strong> · <a className="link" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && ` · ${m.phone}`}{m.orderRef && ` · Order ${m.orderRef}`}</p>
          <p className="text-xs text-muted">{m.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
          <form action={markMessagesAction} className="mt-3"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="handled" value={m.handled ? "0" : "1"} /><button className="btn-ghost btn-sm">{m.handled ? "Mark as open" : "Mark as handled"}</button></form>
        </article>
      ))}
    </div>
  );
}
