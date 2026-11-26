// DEV ONLY: drops all data and re-applies migrations. Refuses to run in production mode.
import { execSync } from "node:child_process";
import { Pool } from "pg";

async function main() {
  if (process.env.STORE_MODE === "production" || process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  await pool.end();
  execSync("npm run db:migrate && npm run db:seed", { stdio: "inherit" });
}
main().catch((e) => { console.error(e); process.exit(1); });
