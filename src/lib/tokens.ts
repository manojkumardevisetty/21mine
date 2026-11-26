import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const GUEST_LINK_DAYS = 30;

function sign(payload: string) {
  if (!env.orderLinkSecret) throw new Error("ORDER_LINK_SECRET is not configured");
  return createHmac("sha256", env.orderLinkSecret).update(payload).digest("base64url");
}

/** Signed, time-limited token granting access to a single order (guest checkout). */
export function createOrderToken(orderId: string, days = GUEST_LINK_DAYS): string {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = `${orderId}.${exp}`;
  return `${exp}.${sign(payload)}`;
}

export function verifyOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(`${orderId}.${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
