// Applies SQL migrations in ./drizzle (used by `npm run db:migrate`, safe for production)
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
if (!process.env.DATABASE_URL) {
  console.error("\n✗ DATABASE_URL is not set. Connect a PostgreSQL database (Vercel → Storage → Neon → connect to this project), then redeploy.\n");
  process.exit(1);
}


async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied");
}
main().catch((e) => { console.error(e); process.exit(1); });
