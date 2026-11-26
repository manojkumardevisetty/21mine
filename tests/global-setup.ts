import { execSync } from "node:child_process";
import { Client } from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/twentyonemine_test";
  const u = new URL(url);
  const dbName = u.pathname.slice(1);
  u.pathname = "/postgres";
  const c = new Client({ connectionString: u.toString() });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await c.query(`CREATE DATABASE ${dbName}`);
  await c.end();
  const env = { ...process.env, DATABASE_URL: url, SEED_ADMIN_PASSWORD: "Admin#Test2026", STORE_MODE: "demo" };
  execSync("npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts", { env, stdio: "pipe" });
}
