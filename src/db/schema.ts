// 21mine database schema (Drizzle ORM / PostgreSQL).
// Catalogue prices are stored in AED fils (base currency). Orders store amounts in the charge currency minor units.
import { relations, sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["CUSTOMER", "STAFF", "ADMIN"]);
export const productKindEnum = pgEnum("product_kind", [
  "PERFUME", "PRESS_ON_NAILS", "NAIL_ACCESSORY", "FASHION_ACCESSORY",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED",
]);
export const discountTypeEnum = pgEnum("discount_type", ["PERCENT", "FIXED"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("CUSTOMER"),
  sessionVersion: integer("session_version").notNull().default(0),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  marketingOptInAt: timestamp("marketing_opt_in_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const addresses = pgTable("addresses", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull().default("AE"), // ISO 3166-1 alpha-2
  region: text("region").notNull(), // Emirate (UAE) or state/province
  city: text("city").notNull(), // Area/community (UAE) or city
  street: text("street"),
  building: text("building").notNull(), // Building/villa (UAE) or address line 1
  postalCode: text("postal_code"),
  unit: text("unit"),
  landmark: text("landmark"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("addresses_user_idx").on(t.userId)]);

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description").notNull(),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  kind: productKindEnum("kind").notNull(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  // Kind-specific attributes (perfume notes/concentration, nail shape/finish, material, ...)
  details: jsonb("details").$type<Record<string, string>>().notNull().default({}),
  highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
  careInfo: text("care_info"),
  isPublished: boolean("is_published").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("products_category_idx").on(t.categoryId)]);

export const productImages = pgTable("product_images", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("product_images_product_idx").on(t.productId)]);

export const variants = pgTable("variants", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
  priceFils: integer("price_fils").notNull(),
  compareAtFils: integer("compare_at_fils"),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("variants_product_idx").on(t.productId)]);

export const carts = pgTable("carts", {
  id: id(),
  userId: text("user_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable("cart_items", {
  id: id(),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: text("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
}, (t) => [uniqueIndex("cart_items_cart_variant_uq").on(t.cartId, t.variantId)]);

export const discountCodes = pgTable("discount_codes", {
  id: id(),
  code: text("code").notNull().unique(),
  type: discountTypeEnum("type").notNull(),
  value: integer("value").notNull(), // percent (1-100) or fils
  minSubtotalFils: integer("min_subtotal_fils").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export type MerchantSnapshot = {
  brandName: string;
  legalName: string | null;
  tradeLicenceNumber: string | null;
  licenceAuthority: string | null;
  businessAddress: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  taxRegistrationNumber: string | null;
  taxInvoice: boolean;
  pricesIncludeTax: boolean;
};

export const orders = pgTable("orders", {
  id: id(),
  number: text("number").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  // One key per checkout attempt: repeated submissions return the same order
  idempotencyKey: text("idempotency_key").notNull().unique(),
  email: text("email").notNull(),
  status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  paymentProvider: text("payment_provider").notNull(),
  paymentMethod: text("payment_method").notNull(),
  // Amounts below are in the order (charge) currency, in its minor units (fils, cents, ...)
  currency: text("currency").notNull().default("AED"),
  currencyExponent: integer("currency_exponent").notNull().default(2),
  // Rate used at purchase: 1 AED = fxRateMicros / 1e6 units of `currency`
  fxRateMicros: integer("fx_rate_micros").notNull().default(1000000),
  subtotalMinor: integer("subtotal_minor").notNull(),
  discountMinor: integer("discount_minor").notNull().default(0),
  discountCode: text("discount_code"),
  shippingMinor: integer("shipping_minor").notNull(),
  taxMinor: integer("tax_minor").notNull().default(0),
  taxRateBps: integer("tax_rate_bps").notNull().default(0),
  totalMinor: integer("total_minor").notNull(),
  // Base-currency (AED fils) equivalent of the total, for reporting
  totalBaseFils: integer("total_base_fils").notNull(),
  shipName: text("ship_name").notNull(),
  shipPhone: text("ship_phone").notNull(),
  shipCountry: text("ship_country").notNull().default("AE"),
  shipRegion: text("ship_region").notNull(),
  shipCity: text("ship_city").notNull(),
  shipStreet: text("ship_street"),
  shipBuilding: text("ship_building").notNull(),
  shipPostalCode: text("ship_postal_code"),
  shipUnit: text("ship_unit"),
  shipLandmark: text("ship_landmark"),
  deliveryNotes: text("delivery_notes"),
  merchantSnapshot: jsonb("merchant_snapshot").$type<MerchantSnapshot>().notNull(),
  stockReleased: boolean("stock_released").notNull().default(false),
  invoiceNumber: text("invoice_number").unique(),
  invoiceIssuedAt: timestamp("invoice_issued_at", { withTimezone: true }),
  trackingNumber: text("tracking_number"),
  isDemo: boolean("is_demo").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("orders_user_idx").on(t.userId),
  index("orders_status_idx").on(t.status),
  index("orders_payment_status_idx").on(t.paymentStatus),
  index("orders_created_idx").on(t.createdAt),
]);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => variants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  sku: text("sku").notNull(),
  productSlug: text("product_slug").notNull(),
  image: text("image"),
  details: jsonb("details").$type<Record<string, string>>().notNull().default({}),
  unitPriceMinor: integer("unit_price_minor").notNull(), // order currency
  quantity: integer("quantity").notNull(),
  lineTotalMinor: integer("line_total_minor").notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  method: text("method").notNull(),
  providerRef: text("provider_ref").notNull().unique(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  refundedMinor: integer("refunded_minor").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("payments_order_idx").on(t.orderId)]);

// Each provider event is stored once (unique id) => idempotent webhook/event handling
export const paymentEvents = pgTable("payment_events", {
  id: id(),
  paymentId: text("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  providerEventId: text("provider_event_id").notNull().unique(),
  type: text("type").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: createdAt(),
});

export const orderEvents = pgTable("order_events", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  actor: text("actor").notNull().default("system"),
  createdAt: createdAt(),
}, (t) => [index("order_events_order_idx").on(t.orderId)]);

export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

// A zone matches a country, optionally narrowed to one region (e.g. an emirate). Fees are AED fils.
export type DeliveryZone = {
  id: string; label: string; country: string; region?: string | null;
  feeFils: number; freeOverFils?: number | null; etaDays: string; enabled: boolean;
};

export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(), // ISO 4217
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  exponent: integer("exponent").notNull().default(2),
  // 1 AED = rateMicros / 1e6 units of this currency (manually maintained in Admin)
  rateMicros: integer("rate_micros").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isBase: boolean("is_base").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  brandName: text("brand_name").notNull(),
  legalName: text("legal_name"),
  tradeLicenceNumber: text("trade_licence_number"),
  licenceAuthority: text("licence_authority"),
  businessAddress: text("business_address"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  supportHours: text("support_hours"),
  deliveryZones: jsonb("delivery_zones").$type<DeliveryZone[]>().notNull(),
  // Tax (e.g. UAE VAT) applies only to deliveries in these countries
  taxCountries: text("tax_countries").array().notNull().default(sql`'{AE}'::text[]`),
  returnWindowDays: integer("return_window_days").notNull().default(7),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxRateBps: integer("tax_rate_bps").notNull().default(500),
  taxRegistrationNumber: text("tax_registration_number"),
  pricesIncludeTax: boolean("prices_include_tax").notNull().default(true),
  taxInvoiceConfirmed: boolean("tax_invoice_confirmed").notNull().default(false),
  paymentProviderName: text("payment_provider_name").notNull().default("Simulated (demo)"),
  // Setting keys the merchant has explicitly confirmed as final
  confirmedFields: text("confirmed_fields").array().notNull().default(sql`'{}'::text[]`),
  updatedAt: updatedAt(),
});

export const policyPages = pgTable("policy_pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  needsReview: boolean("needs_review").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)]);

export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "APPROVED", "REJECTED"]);

// Only customers with a paid order containing the product can review it (verified purchase).
export const reviews = pgTable("reviews", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  displayName: text("display_name").notNull(),
  status: reviewStatusEnum("status").notNull().default("PENDING"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("reviews_user_product_uq").on(t.userId, t.productId), index("reviews_product_idx").on(t.productId, t.status)]);

export const outboxEmails = pgTable("outbox_emails", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  orderRef: text("order_ref"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

// ---------- relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses), orders: many(orders),
}));
export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(variants),
  images: many(productImages),
  reviews: many(reviews),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));
export const cartsRelations = relations(carts, ({ many }) => ({ items: many(cartItems) }));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(variants, { fields: [cartItems.variantId], references: [variants.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems), payments: many(payments), history: many(orderEvents),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  events: many(paymentEvents),
}));
export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, { fields: [paymentEvents.paymentId], references: [payments.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

