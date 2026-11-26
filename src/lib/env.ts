export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  storeMode: (process.env.STORE_MODE ?? "demo") as "demo" | "production",
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "simulated",
  orderLinkSecret: process.env.ORDER_LINK_SECRET ?? process.env.AUTH_SECRET ?? "",
  mailFrom: process.env.MAIL_FROM ?? "21mine <support@21mine.shop>",
  notifyEmail: process.env.STORE_NOTIFY_EMAIL ?? "info@21mine.shop",
};
export const isDemo = () => env.storeMode !== "production";
