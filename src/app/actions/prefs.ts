"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE, resolveCurrency } from "@/lib/currency";
import { LOCALE_COOKIE } from "@/lib/i18n";

const year = 60 * 60 * 24 * 365;

export async function setCurrency(formData: FormData) {
  const cur = await resolveCurrency(String(formData.get("currency") ?? ""));
  (await cookies()).set(CURRENCY_COOKIE, cur.code, { path: "/", maxAge: year, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setLocale(formData: FormData) {
  const v = formData.get("locale") === "ar" ? "ar" : "en";
  (await cookies()).set(LOCALE_COOKIE, v, { path: "/", maxAge: year, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function dismissCookieNotice() {
  (await cookies()).set("cookie_notice", "1", { path: "/", maxAge: year, sameSite: "lax" });
}
