import { db, schema, type Tx } from "@/db";

export async function audit(
  actor: { id: string; email: string } | null,
  action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}, tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLogs).values({
    actorId: actor?.id ?? null, actorEmail: actor?.email ?? null, action, entity, entityId, details,
  });
}
