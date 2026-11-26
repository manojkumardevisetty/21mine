import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function getUser() {
  const s = await auth();
  return s?.user ?? null;
}

export async function requireUser(next = "/account") {
  const u = await getUser();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

export const isStaff = (role?: string) => role === "ADMIN" || role === "STAFF";

/** STAFF can manage catalogue & orders; ADMIN additionally settings, users, currencies, policies. */
export async function requireStaff(adminOnly = false) {
  const u = await getUser();
  if (!u) redirect("/account/login?next=/admin");
  if (adminOnly ? u.role !== "ADMIN" : !isStaff(u.role)) redirect("/forbidden");
  return u;
}
