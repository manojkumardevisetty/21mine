import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Fixed-window limiter stored in Postgres (works across server instances). */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const res = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + make_interval(secs => ${windowSec}) ELSE rate_limits.reset_at END
    RETURNING count`);
  return Number(res.rows[0]?.count ?? 0) <= limit;
}
