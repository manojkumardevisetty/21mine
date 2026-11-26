import Link from "next/link";
import { getT } from "@/lib/i18n";
import { cartCount } from "@/lib/cart";
import { currentCurrency, listCurrencies } from "@/lib/currency";
import { getUser, isStaff } from "@/lib/authz";
import { setCurrency, setLocale } from "@/app/actions/prefs";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { AutoSubmitSelect } from "./AutoSubmitSelect";

export async function Header() {
  const [{ t, locale }, count, cur, currencies, user, settings] = await Promise.all([getT(), cartCount(), currentCurrency(), listCurrencies(), getUser(), getSettings()]);
  const aeFree = settings.deliveryZones.filter((z) => z.enabled && z.country === "AE" && z.freeOverFils).map((z) => z.freeOverFils!);
  const intl = settings.deliveryZones.some((z) => z.enabled && z.country !== "AE");
  const promo = [aeFree.length ? `Free UAE delivery over AED ${Math.min(...aeFree) / 100}` : "UAE delivery", intl ? "Worldwide shipping" : ""].filter(Boolean).join(" · ");
  const links = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/category/perfumes", label: t("nav.perfumes") },
    { href: "/category/press-on-nails", label: t("nav.nails") },
    { href: "/category/nail-care", label: t("nav.nailcare") },
    { href: "/category/jewellery", label: t("nav.jewellery") },
    { href: "/category/fashion-accessories", label: t("nav.accessories") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-sand/80 bg-ivory/95 backdrop-blur">
      <div className="hidden border-b border-sand/60 sm:block">
        <div className="container-x flex h-9 items-center justify-between text-xs text-muted">
          <p>{promo}</p>
          <div className="flex items-center gap-2">
            <AutoSubmitSelect action={setCurrency} name="currency" value={cur.code} label={t("currency.label")}
              options={currencies.map((c) => ({ value: c.code, label: `${c.code}` }))} />
            <AutoSubmitSelect action={setLocale} name="locale" value={locale} label={t("language.label")}
              options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
          </div>
        </div>
      </div>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MobileMenu links={[...links, { href: "/contact", label: t("nav.contact") }]} labels={{ menu: t("nav.menu"), close: t("nav.close") }} />
          <Link href="/" aria-label="21mine home"><Logo /></Link>
        </div>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm">
            {links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-rose-deep">{l.label}</Link></li>)}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/shop?focus=search" className="btn-ghost" aria-label={t("nav.search")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          {user && isStaff(user.role) && <Link href="/admin" className="btn-ghost hidden text-xs sm:inline-flex">Admin</Link>}
          <Link href={user ? "/account" : "/account/login"} className="btn-ghost" aria-label={user ? t("nav.account") : t("nav.signin")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          </Link>
          <Link href="/cart" className="btn-ghost relative" aria-label={`${t("nav.bag")} (${count})`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
            {count > 0 && <span className="absolute -top-0.5 end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">{count}</span>}
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-sand/60 px-4 py-1.5 sm:hidden">
        <AutoSubmitSelect action={setCurrency} name="currency" value={cur.code} label={t("currency.label")} idSuffix="-m"
          options={currencies.map((c) => ({ value: c.code, label: c.code }))} />
        <AutoSubmitSelect action={setLocale} name="locale" value={locale} label={t("language.label")} idSuffix="-m"
          options={[{ value: "en", label: "EN" }, { value: "ar", label: "عربي" }]} />
      </div>
    </header>
  );
}
