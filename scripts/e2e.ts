// End-to-end browser test against a running server (npm run build && npm start, then npm run e2e).
// Requires Chrome/Chromium: set CHROME_PATH (default /usr/bin/google-chrome).
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Client } from "pg";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "info@21mine.shop";
const ADMIN_PASS = process.env.SEED_ADMIN_PASSWORD ?? "";
const run = Date.now().toString(36);
const db = new Client({ connectionString: process.env.DATABASE_URL });
let passed = 0;
let cur: Page | null = null;
const results: string[] = [];

async function step(name: string, fn: () => Promise<void>) {
  const t = Date.now();
  try { await fn(); passed++; results.push(`✓ ${name} (${Date.now() - t} ms)`); console.log(`✓ ${name}`); }
  catch (e) { if (cur) { await cur.screenshot({ path: "/tmp/e2e-fail.png" }).catch(() => {}); console.error("  at URL:", cur.url()); } results.push(`✗ ${name}: ${(e as Error).message}`); console.error(`✗ ${name}\n  ${(e as Error).stack}`); throw e; }
}
function assert(c: unknown, msg: string): asserts c { if (!c) throw new Error(msg); }

const path = (p: Page) => new URL(p.url()).pathname;
async function waitPath(p: Page, prefix: string, timeout = 20000) {
  await p.waitForFunction((x) => location.pathname.startsWith(x), { timeout }, prefix);
}
async function waitExact(p: Page, x: string, timeout = 20000) {
  await p.waitForFunction((v) => location.pathname === v, { timeout }, x);
  await p.waitForNetworkIdle({ timeout: 10000 }).catch(() => {});
}
async function idle(p: Page) { await p.waitForNetworkIdle({ idleTime: 400, timeout: 8000 }).catch(() => {}); }
async function go(p: Page, url: string) { cur = p; await p.goto(BASE + url, { waitUntil: "networkidle0" }); }
async function text(p: Page) { return p.evaluate(() => document.body.innerText); }
async function fill(p: Page, sel: string, v: string) {
  await p.$eval(sel, (el) => { (el as HTMLInputElement).value = ""; });
  await p.type(sel, v);
}
async function clickText(p: Page, tag: string, label: string) {
  const els = await p.$$(tag);
  for (const el of els) {
    const t = await el.evaluate((e) => (e as HTMLElement).innerText.trim());
    if (t.startsWith(label)) { await el.click(); return; }
  }
  throw new Error(`No <${tag}> starting with "${label}"`);
}
async function waitText(p: Page, s: string, timeout = 15000) {
  await p.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, s);
}
async function outboxLink(to: string, pattern: RegExp) {
  for (let i = 0; i < 20; i++) {
    const r = await db.query("select body from outbox_emails where \"to\" = $1 order by created_at desc limit 5", [to]);
    for (const row of r.rows) { const m = (row.body as string).match(pattern); if (m) return m[0]; }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error(`No email to ${to} matching ${pattern}`);
}
async function fetchWithCookies(p: Page, url: string) {
  return p.evaluate(async (u) => {
    const r = await fetch(u);
    const buf = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, type: r.headers.get("content-type"), bytes: Array.from(buf) };
  }, url);
}

async function register(p: Page, email: string, pass: string, name: string) {
  await go(p, "/account/register");
  await fill(p, "#f-name", name); await fill(p, "#f-email", email); await fill(p, "#f-password", pass); await fill(p, "#f-confirm", pass);
  await p.click('input[name="privacy"]');
  await clickText(p, "button", "Create account");
  await waitExact(p, "/account");
}
async function login(p: Page, email: string, pass: string, next = "/account") {
  await go(p, `/account/login?next=${encodeURIComponent(next)}`);
  await fill(p, "#f-email", email); await fill(p, "#f-password", pass);
  await clickText(p, "button", "Sign in");
  await waitExact(p, next);
}
async function addToBag(p: Page, slug: string, variantLabel?: string) {
  await go(p, `/product/${slug}`);
  if (variantLabel) await clickText(p, "label", variantLabel);
  await clickText(p, "button", "Add to cart");
  await waitText(p, "Added to your cart");
  await p.keyboard.press("Escape");
}
async function fillUAEAddress(p: Page, emirate = "Dubai") {
  await fill(p, "#f-fullName", "Layla Test");
  await fill(p, "#f-phone", "+971 50 123 4567");
  await p.select("#f-region", emirate);
  await fill(p, "#f-city", "Dubai Marina");
  await fill(p, "#f-building", "Marina Gate 1");
  await fill(p, "#f-unit", "Apt 1203");
}
async function placeOrder(p: Page, opts: { doubleClick?: boolean } = {}) {
  await p.click('input[name="acceptTerms"]');
  await new Promise((r) => setTimeout(r, 800)); // let the live quote settle
  await p.waitForFunction(() => [...document.querySelectorAll("button[type=submit]")].some((b) => /^Continue to secure payment/.test((b as HTMLElement).innerText) && !(b as HTMLButtonElement).disabled));
  let btn = null;
  for (const b of await p.$$("button[type=submit]")) if (/^Continue to secure payment/.test(await b.evaluate((e) => (e as HTMLElement).innerText))) btn = b;
  if (!btn) throw new Error("Place order button not found");
  if (opts.doubleClick) { await btn.click(); await btn.click().catch(() => {}); await btn.click().catch(() => {}); }
  else await btn.click();
  await waitPath(p, "/pay/simulated/");
}
async function simulate(p: Page, label: "Pay " | "Simulate declined payment" | "Cancel payment") {
  await clickText(p, "button", label);
  await waitPath(p, "/orders/");
  await idle(p);
}
const pdfText = (bytes: number[]) => {
  writeFileSync("/tmp/e2e-invoice.pdf", Buffer.from(bytes));
  return execFileSync("pdftotext", ["-layout", "/tmp/e2e-invoice.pdf", "-"]).toString();
};

async function main() {
  await db.connect();
  const browser: Browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const A = { email: `layla.${run}@example.com`, pass: "Rose#Oud2026", name: "Layla Test" };
  const B = { email: `sara.${run}@example.com`, pass: "Jasmine#2026", name: "Sara Other" };
  let orderNumberA = "", orderIdA = "", invoiceUrlA = "";

  const ctxA = await browser.createBrowserContext();
  const p = await ctxA.newPage();
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); // mobile-first

  await step("Home page, catalogue and policies load", async () => {
    await go(p, "/");
    await clickText(p, "button", "OK, got it");
    await idle(p);
    const t = await text(p);
    assert(/Customer\s+favourites/.test(t) && t.includes("XENTERPRISES DIGITAL SERVICES - FZCO"), "home content");
    for (const s of ["terms", "privacy", "cookies", "shipping", "returns", "contact"]) {
      const r = await p.goto(`${BASE}/policies/${s}`); assert(r?.status() === 200, `policy ${s}`);
      assert(!(await text(p)).includes("{{"), `unfilled token on ${s}`);
    }
  });

  await step("Search and filters (category, price, availability)", async () => {
    await go(p, "/shop?q=rose&stock=1");
    assert((await text(p)).includes("Rose Oud Noir"), "search finds Rose Oud");
    await go(p, "/category/press-on-nails?min=70&max=100");
    const t = await text(p);
    assert(t.includes("Rose Chrome Coffin") && !t.includes("Nude Almond Gloss"), "price filter");
    await go(p, "/shop?min=abc");
    assert((await text(p)).includes("Enter prices as numbers"), "price validation message");
  });

  await step("Arabic / RTL switch", async () => {
    await go(p, "/");
    await p.click('button[aria-controls="mobile-nav"]');
    await p.click('#mobile-nav button[data-locale="ar"]');
    await p.waitForFunction(() => document.documentElement.dir === "rtl");
    await p.click('button[aria-controls="mobile-nav"]');
    await p.click('#mobile-nav button[data-locale="en"]');
    await p.waitForFunction(() => document.documentElement.dir === "ltr");
  });

  await step("Registration validation + register + logout + login", async () => {
    await go(p, "/account/register");
    await fill(p, "#f-email", "not-an-email"); await fill(p, "#f-password", "short");
    await clickText(p, "button", "Create account");
    await waitText(p, "Enter a valid email address");
    assert((await text(p)).includes("Use at least 10 characters"), "password rule shown");
    await register(p, A.email, A.pass, A.name);
    assert((await text(p)).includes("Hello, Layla"), "account dashboard");
    await go(p, "/account/settings");
    await clickText(p, "button", "Sign out of all devices");
    await waitPath(p, "/account/login");
    await go(p, "/account/login");
    await fill(p, "#f-email", A.email); await fill(p, "#f-password", "wrong-password1");
    await clickText(p, "button", "Sign in");
    await waitText(p, "Incorrect email or password");
    await login(p, A.email, A.pass);
  });

  await step("Password reset by email link", async () => {
    await clickText(p, "button", "Sign out");
    await waitExact(p, "/");
    await go(p, "/account/forgot");
    await fill(p, "#f-email", A.email);
    await clickText(p, "button", "Send reset link");
    await waitText(p, "If an account exists");
    const link = await outboxLink(A.email, /https?:\/\/\S+\/account\/reset\?token=[\w-]+/);
    await p.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle0" });
    A.pass = "NewRose#2026x";
    await fill(p, "#f-password", A.pass); await fill(p, "#f-confirm", A.pass);
    await clickText(p, "button", "Set new password");
    await waitText(p, "Your password has been reset");
    await p.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle0" });
    await fill(p, "#f-password", "Another#2026x"); await fill(p, "#f-confirm", "Another#2026x");
    await clickText(p, "button", "Set new password");
    await waitText(p, "invalid or has expired");
    await login(p, A.email, A.pass);
  });

  await step("Mobile checkout: variant -> bag -> UAE address -> totals -> double-submit -> success -> confirmation", async () => {
    await addToBag(p, "rose-oud-noir-eau-de-parfum", "100 ml");
    await addToBag(p, "nude-almond-gloss-press-on-nails", "M - Medium");
    await go(p, "/cart");
    const cartText = await text(p);
    assert(cartText.includes("Rose Oud Noir") && cartText.includes("100 ml"), "cart lines");
    await p.click('button[aria-label="Increase quantity of Nude Almond Gloss Press-On Nails"]');
    await p.waitForSelector('span[aria-label="Quantity 2"]');
    await p.click('button[aria-label="Decrease quantity of Nude Almond Gloss Press-On Nails"]');
    await p.waitForSelector('span[aria-label="Quantity 1"]');
    await go(p, "/checkout");
    await clickText(p, "button", "Continue to secure payment"); // missing terms + fields
    await waitText(p, "Please check the highlighted fields");
    await fillUAEAddress(p, "Dubai");
    await p.waitForFunction(() => document.body.innerText.includes("Free"));
    const shown = await p.evaluate(() => [...document.querySelectorAll("dt")].find((d) => d.textContent === "Total")?.nextElementSibling?.textContent ?? "");
    assert(/448\.00/.test(shown), `total shown before payment: ${shown}`); // 379 + 69, free delivery
    const before = (await db.query("select count(*)::int n from orders o join users u on u.id=o.user_id where u.email=$1", [A.email])).rows[0].n;
    await placeOrder(p, { doubleClick: true });
    const after = (await db.query("select count(*)::int n from orders o join users u on u.id=o.user_id where u.email=$1", [A.email])).rows[0].n;
    assert(after === before + 1, `double submit created ${after - before} orders`);
    const t = await text(p);
    assert(t.includes("TEST PAYMENT") && t.includes("no money will be collected"), "test-payment notice on payment step");
    assert((await p.$$('input[type="password"], input[autocomplete="cc-number"]')).length === 0, "no card fields");
    await simulate(p, "Pay ");
    await waitText(p, "your order is confirmed");
    orderNumberA = decodeURIComponent(path(p).split("/").pop()!);
    const r = await db.query("select id, total_minor, invoice_number from orders where number=$1", [orderNumberA]);
    orderIdA = r.rows[0].id;
    assert(r.rows[0].total_minor === 44800 && r.rows[0].invoice_number, "order paid with invoice number");
    invoiceUrlA = (await p.$eval('a[href^="/api/invoices/"]', (a) => a.getAttribute("href")))!;
  });

  await step("PDF invoice downloads and totals match the order", async () => {
    const res = await fetchWithCookies(p, invoiceUrlA);
    assert(res.status === 200 && res.type === "application/pdf", `invoice status ${res.status}`);
    const t = pdfText(res.bytes);
    for (const s of ["INVOICE", "Test transaction: no payment was collected", "XENTERPRISES DIGITAL SERVICES - FZCO", "Trade licence 18250", orderNumberA, "AED 448.00", "Rose Oud Noir Eau de Parfum", "Paid"])
      assert(t.includes(s), `invoice missing "${s}"`);
    assert(!t.includes("TAX INVOICE") && !t.includes("TRN") && !/sample|demo/i.test(t), "no tax/demo wording");
  });

  await step("Order history and confirmation email", async () => {
    await go(p, "/account/orders");
    const t = await text(p);
    assert(t.includes(orderNumberA) && t.includes("Confirmed") && t.includes("Invoice PDF"), "order history");
    await outboxLink(A.email, new RegExp(`Order: ${orderNumberA}`));
    await outboxLink("info@21mine.shop", new RegExp(orderNumberA));
  });

  await step("Declined payment -> retry -> success; stock reserved meanwhile", async () => {
    const before = (await db.query("select stock from variants where sku='PN-MILKPRL-S'")).rows[0].stock;
    await addToBag(p, "milky-pearl-short-squoval-press-on-nails", "S - Small");
    await go(p, "/checkout");
    await placeOrder(p);
    await simulate(p, "Simulate declined payment");
    await waitText(p, "Your payment was declined");
    assert((await db.query("select stock from variants where sku='PN-MILKPRL-S'")).rows[0].stock === before - 1, "stock reserved after decline");
    await clickText(p, "button", "Try payment again");
    await waitPath(p, "/pay/simulated/");
    await simulate(p, "Pay ");
    await waitText(p, "your order is confirmed");
  });

  await step("Cancelled payment releases stock", async () => {
    const before = (await db.query("select stock from variants where sku='JW-PEARLHUG-GOLD'")).rows[0].stock;
    await addToBag(p, "pearl-drop-huggie-earrings");
    await go(p, "/checkout");
    await placeOrder(p);
    await simulate(p, "Cancel payment");
    await waitText(p, "Payment cancelled");
    assert((await db.query("select stock from variants where sku='JW-PEARLHUG-GOLD'")).rows[0].stock === before, "stock released");
  });

  await step("Verified-purchase review submission", async () => {
    await go(p, "/product/rose-oud-noir-eau-de-parfum#reviews");
    const stars = await p.$$('input[name="rating"]'); await stars[4].evaluate((e) => (e as HTMLInputElement).click());
    await fill(p, "#f-title", "Beautiful rose oud");
    await fill(p, "#f-body", "Long lasting and elegant, I get compliments every time I wear it.");
    await clickText(p, "button", "Submit review");
    await waitText(p, "will appear once approved");
  });

  // ---------- Second customer: cross-account protection ----------
  const ctxB = await browser.createBrowserContext();
  const pb = await ctxB.newPage();
  await pb.setCookie({ name: "cookie_notice", value: "1", url: BASE });
  await step("Cross-account access is blocked (order page, invoice, admin)", async () => {
    await register(pb, B.email, B.pass, B.name);
    const r = await pb.goto(`${BASE}/orders/${encodeURIComponent(orderNumberA)}`);
    assert(r?.status() === 404, `other user's order returned ${r?.status()}`);
    const inv = await fetchWithCookies(pb, `/api/invoices/${orderIdA}`);
    assert(inv.status === 404, `other user's invoice returned ${inv.status}`);
    await pb.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
    assert(path(pb) === "/forbidden", `customer reached ${path(pb)}`);
    const rv = await pb.goto(`${BASE}/product/rose-oud-noir-eau-de-parfum`, { waitUntil: "networkidle0" });
    assert(rv?.status() === 200 && (await text(pb)).includes("once you've purchased"), "non-buyer can't review");
  });

  // ---------- Guest checkout in USD ----------
  const ctxG = await browser.createBrowserContext();
  const pg = await ctxG.newPage();
  await pg.setCookie({ name: "cookie_notice", value: "1", url: BASE });
  await pg.setViewport({ width: 1280, height: 900 });
  let guestUrl = "";
  await step("Guest checkout in USD to the UK with signed order link", async () => {
    await go(pg, "/");
    await pg.click('button[aria-label^="Currency:"]');
    await pg.click('button[data-currency="USD"]');
    await pg.waitForFunction(() => document.body.innerText.includes("$"));
    await addToBag(pg, "classic-french-tip-square-press-on-nails", "L - Large");
    await go(pg, "/checkout");
    await fill(pg, "#f-email", `guest.${run}@example.com`);
    await pg.select("#f-country", "GB");
    await fill(pg, "#f-fullName", "Guest Buyer"); await fill(pg, "#f-phone", "+44 20 7946 0000");
    await fill(pg, "#f-region", "Greater London"); await fill(pg, "#f-city", "London"); await fill(pg, "#f-building", "221B Baker Street");
    await pg.waitForSelector("#f-postalCode"); await fill(pg, "#f-postalCode", "NW1 6XE");
    await pg.click("#f-city");
    await pg.waitForFunction(() => /\$25\.87/.test(document.body.innerText), { timeout: 15000 }); // AED 95 delivery
    await placeOrder(pg);
    await simulate(pg, "Pay ");
    await waitText(pg, "your order is confirmed");
    guestUrl = pg.url();
    const t = await text(pg);
    assert(t.includes("Total (USD)") && t.includes("$"), "USD order");
    const inv = await pg.$eval('a[href^="/api/invoices/"]', (a) => a.getAttribute("href"))!;
    const res = await fetchWithCookies(pg, inv!);
    const it = pdfText(res.bytes);
    assert(res.status === 200 && it.includes("USD") && it.includes("converted from AED"), "USD invoice with FX note");
    const noToken = await pg.goto(guestUrl.split("?")[0]);
    assert(noToken?.status() === 404, "guest order without token is hidden");
    const ok = await pg.goto(guestUrl);
    assert(ok?.status() === 200, "guest order with token visible");
  });

  // ---------- Admin ----------
  const ctxAd = await browser.createBrowserContext();
  const pa = await ctxAd.newPage();
  await pa.setCookie({ name: "cookie_notice", value: "1", url: BASE });
  await pa.setViewport({ width: 1366, height: 900 });
  await step("Admin: login, dashboard checklist, fulfil order with audit + email, approve review", async () => {
    assert(ADMIN_PASS, "SEED_ADMIN_PASSWORD env required for admin e2e");
    await login(pa, ADMIN_EMAIL, ADMIN_PASS, "/admin");
    const dash = await text(pa);
    assert(dash.includes("Launch checklist") && dash.includes("Support phone number"), "checklist flags missing phone");
    await go(pa, `/admin/orders?q=${encodeURIComponent(orderNumberA)}`);
    assert((await text(pa)).includes(orderNumberA), "admin order search");
    await go(pa, `/admin/orders/${orderIdA}`);
    await pa.select("#st", "SHIPPED");
    await clickText(pa, "button", "Update status");
    await waitText(pa, "tracking number");
    await fill(pa, "#tr", "AWB-12345678");
    await clickText(pa, "button", "Update status");
    await waitText(pa, "Order marked as shipped");
    await outboxLink(A.email, /is on its way|has been shipped/);
    const audit = await db.query("select actor_email from audit_logs where entity='order' and entity_id=$1 and action='order.status'", [orderIdA]);
    assert(audit.rows[0]?.actor_email === ADMIN_EMAIL, "status change audited");
    await go(pa, "/admin/reviews");
    await clickText(pa, "button", "Approve");
    await idle(pa);
    await go(p, "/product/rose-oud-noir-eau-de-parfum");
    assert((await text(p)).includes("Beautiful rose oud") && (await text(p)).includes("Verified purchase"), "approved review visible");
  });

  await step("Admin: edit stock & price; old order snapshot unchanged", async () => {
    const v = (await db.query("select id, product_id from variants where sku='PF-AMBMUSK-50'")).rows[0];
    await go(pa, `/admin/products/${v.product_id}`);
    const forms = await pa.$$("form");
    for (const f of forms) {
      const sku = await f.$eval('input[name="sku"]', (e) => (e as HTMLInputElement).value).catch(() => null);
      if (sku === "PF-AMBMUSK-50") {
        const price = await f.$('input[name="price"]'); await price!.click({ count: 3 }); await price!.type("229.00");
        await (await f.$("button[type=submit]"))!.click();
        break;
      }
    }
    await waitText(pa, "Variant updated");
    assert((await db.query("select price_fils from variants where sku='PF-AMBMUSK-50'")).rows[0].price_fils === 22900, "price saved");
    const snap = await db.query("select unit_price_minor from order_items where order_id=$1 and sku='PF-ROSEOUD-100'", [orderIdA]);
    assert(snap.rows[0].unit_price_minor === 37900, "order snapshot unchanged");
    await db.query("update variants set price_fils=21900 where sku='PF-AMBMUSK-50'");
  });

  await step("Customer cannot see admin-only actions; staff role cannot open settings", async () => {
    const r = await fetchWithCookies(pb, "/api/admin/upload");
    assert(r.status === 405 || r.status === 403, `upload GET ${r.status}`);
    const up = await pb.evaluate(async () => (await fetch("/api/admin/upload", { method: "POST", body: new FormData() })).status);
    assert(up === 403, `customer upload ${up}`);
  });

  await browser.close();
  await db.end();
  writeFileSync("/tmp/e2e-results.txt", results.join("\n"));
  console.log(`\nAll ${passed} E2E steps passed.`);
}

main().catch(async (e) => { console.error("E2E FAILED:", e.message); writeFileSync("/tmp/e2e-results.txt", results.join("\n")); await db.end().catch(() => {}); process.exit(1); });
