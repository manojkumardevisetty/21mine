// Idempotent seed: store settings, currencies, delivery zones, categories, catalogue, policies, admin user.
// Existing rows are never overwritten (safe to re-run after the merchant edits data in Admin).
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { CATEGORIES, PRODUCTS } from "../src/data/catalog";
import { POLICY_PAGES } from "../src/data/policies";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { UAE_EMIRATES } from "../src/lib/countries";
import type { DeliveryZone } from "../src/db/schema";
if (!process.env.DATABASE_URL) {
  console.error("\n✗ DATABASE_URL is not set. Connect a PostgreSQL database (Vercel → Storage → Neon → connect to this project), then redeploy.\n");
  process.exit(1);
}


const aed = (n: number) => Math.round(n * 100);

// Zone fees are opening values for the merchant to confirm in Admin > Settings > Delivery.
const ZONES: DeliveryZone[] = [
  ...UAE_EMIRATES.map((e): DeliveryZone => {
    const near = ["Dubai", "Sharjah", "Ajman"].includes(e);
    return { id: `ae-${e.toLowerCase().replace(/\s+/g, "-")}`, label: `UAE - ${e}`, country: "AE", region: e,
      feeFils: aed(near ? 15 : 20), freeOverFils: aed(200), etaDays: near ? "1-2" : "2-3", enabled: true };
  }),
  ...["SA", "QA", "KW", "BH", "OM"].map((c): DeliveryZone => ({
    id: `gcc-${c.toLowerCase()}`, label: `GCC - ${c}`, country: c, region: null, feeFils: aed(45), freeOverFils: aed(500), etaDays: "3-6", enabled: true,
  })),
  ...["IN", "PK", "GB", "DE", "FR", "IT", "ES", "NL", "US", "CA", "AU", "SG"].map((c): DeliveryZone => ({
    id: `intl-${c.toLowerCase()}`, label: `International - ${c}`, country: c, region: null, feeFils: aed(95), freeOverFils: null, etaDays: "5-10", enabled: true,
  })),
];

// 1 AED = rate. Pegged: USD 3.6725, SAR 3.75, QAR 3.64, BHD 0.376, OMR 0.3845 per USD.
// Floating (EUR, GBP, INR, KWD) from mid-market rates of 19 Nov 2026 - update in Admin > Currencies.
const CURRENCIES = [
  { code: "AED", name: "UAE Dirham", symbol: "AED", exponent: 2, rate: 1, isBase: true },
  { code: "USD", name: "US Dollar", symbol: "$", exponent: 2, rate: 1 / 3.6725 },
  { code: "EUR", name: "Euro", symbol: "€", exponent: 2, rate: 0.9113 / 3.6725 },
  { code: "GBP", name: "British Pound", symbol: "£", exponent: 2, rate: 0.7606 / 3.6725 },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", exponent: 2, rate: 3.75 / 3.6725 },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR", exponent: 2, rate: 3.64 / 3.6725 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", exponent: 3, rate: 0.307 / 3.6725 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD", exponent: 3, rate: 0.376 / 3.6725 },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", exponent: 3, rate: 0.3845 / 3.6725 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", exponent: 2, rate: 95.6 / 3.6725 },
];

async function main() {
  // Settings
  const existing = await db.query.storeSettings.findFirst();
  if (!existing) {
    await db.insert(schema.storeSettings).values({ ...DEFAULT_SETTINGS, deliveryZones: ZONES });
    console.log("✓ store settings");
  }

  // Currencies
  for (const [i, c] of CURRENCIES.entries()) {
    await db.insert(schema.currencies).values({
      code: c.code, name: c.name, symbol: c.symbol, exponent: c.exponent,
      rateMicros: Math.round(c.rate * 1_000_000), isBase: !!c.isBase, sortOrder: i, enabled: true,
    }).onConflictDoNothing();
  }
  console.log("✓ currencies");

  // Categories
  const catIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    await db.insert(schema.categories).values({ ...c, image: `/products/category-${c.slug}.svg` }).onConflictDoNothing();
    const row = await db.query.categories.findFirst({ where: eq(schema.categories.slug, c.slug) });
    catIds[c.slug] = row!.id;
  }
  console.log("✓ categories");

  // Products
  let created = 0;
  for (const p of PRODUCTS) {
    const exists = await db.query.products.findFirst({ where: eq(schema.products.slug, p.slug), columns: { id: true } });
    if (exists) continue;
    await db.transaction(async (tx) => {
      const [prod] = await tx.insert(schema.products).values({
        slug: p.slug, name: p.name, nameAr: p.nameAr ?? null, kind: p.kind, categoryId: catIds[p.category],
        shortDescription: p.short, description: p.description, details: p.details, highlights: p.highlights,
        careInfo: p.care ?? null, isFeatured: !!p.featured, isPublished: true,
      }).returning();
      const alts = ["", " - angled view", " - evening view", " - key details"];
      await tx.insert(schema.productImages).values([1, 2, 3, 4].map((n, i) => ({
        productId: prod.id, url: `/products/${p.slug}-${n}.svg`, alt: `${p.name}${alts[i]}`, sortOrder: i,
      })));
      await tx.insert(schema.variants).values(p.variants.map((v, i) => ({
        productId: prod.id, sku: v.sku, name: v.name, options: v.options, priceFils: aed(v.price),
        compareAtFils: v.compareAt ? aed(v.compareAt) : null, stock: v.stock, sortOrder: i,
      })));
    });
    created++;
  }
  console.log(`✓ products (${created} new)`);

  // Policies
  for (const p of POLICY_PAGES) await db.insert(schema.policyPages).values(p).onConflictDoNothing();
  console.log("✓ policy pages");

  // Admin user
  const email = (process.env.SEED_ADMIN_EMAIL ?? "info@21mine.shop").toLowerCase();
  const admin = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!admin) {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString("base64url");
    await db.insert(schema.users).values({
      email, name: "21mine Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12),
    });
    console.log(`✓ admin user ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : ` (generated password: ${password} - change it after first login)`}`);
  }
}

main().then(() => pool.end()).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
