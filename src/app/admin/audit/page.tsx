import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/authz";

export const metadata = { title: "Audit log" };
export default async function Audit() {
  await requireStaff(true);
  const list = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(300);
  return (
    <div className="space-y-6">
      <h1 className="h-display text-4xl">Audit log</h1>
      <p className="text-sm text-muted">Who changed sensitive settings, prices, stock, order statuses, refunds and roles.</p>
      <div className="card overflow-x-auto"><table className="w-full text-xs">
        <thead className="bg-cream uppercase text-muted"><tr><th className="p-2 text-start">When (GST)</th><th className="p-2 text-start">Who</th><th className="p-2 text-start">Action</th><th className="p-2 text-start">Target</th><th className="p-2 text-start">Details</th></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={a.id} className="border-t border-sand align-top"><td className="p-2 whitespace-nowrap">{a.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</td><td className="p-2">{a.actorEmail ?? "system"}</td><td className="p-2">{a.action}</td><td className="p-2">{a.entity} {a.entityId}</td><td className="p-2"><code className="break-all">{JSON.stringify(a.details)}</code></td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
