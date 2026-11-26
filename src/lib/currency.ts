import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { AED, type CurrencyInfo } from "./money";

export type Currency = typeof schema.currencies.$inferSelect;
export const CURRENCY_COOKIE = "currency";

export async function listCurrencies(onlyEnabled = true): Promise<Currency[]> {
  const rows = await db.select().from(schema.currencies).orderBy(asc(schema.currencies.sortOrder));
  return onlyEnabled ? rows.filter((r) => r.enabled) : rows;
}

/** Validates the code against enabled currencies; falls back to AED. */
export async function resolveCurrency(code?: string | null): Promise<CurrencyInfo> {
  if (!code || code === "AED") return AED;
  const row = await db.query.currencies.findFirst({ where: eq(schema.currencies.code, code) });
  if (!row || !row.enabled) return AED;
  return { code: row.code, symbol: row.symbol, exponent: row.exponent, rateMicros: row.rateMicros };
}

export async function currentCurrency(): Promise<CurrencyInfo> {
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return resolveCurrency(c);
}
