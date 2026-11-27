import Link from "next/link";
import { getT } from "@/lib/i18n";
import { currentCurrency, listCurrencies } from "@/lib/currency";
import { getUser, isStaff } from "@/lib/authz";
import { listCategories } from "@/lib/catalog";
import { setCurrency, setLocale } from "@/app/actions/prefs";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { CartButton } from "./CartDrawer";
import { AnnouncementBar, NavDropdown, NavLink, PrefsMenu } from "./HeaderParts";

const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;

export async function Header() {
  const [{ t, locale }, cur, currencies, user, settings, cats] = await Promise.all([getT(), currentCurrency(), listCurrencies(), getUser(), getSettings(), listCategories()]);
  const aeFree = settings.deliveryZones.filter((z) => z.enabled && z.country === "AE" && z.freeOverFils).map((z) => z.freeOverFils!);
  const intl = settings.deliveryZones.some((z) => z.enabled && z.country !== "AE");
  const announcement = [aeFree.length ? `Free UAE delivery over AED ${Math.min(...aeFree) / 100}` : "", "1-2 day delivery in Dubai", intl ? "Worldwide shipping" : ""].filter(Boolean).join(" · ");
  const catName = (c: (typeof cats)[number]) => (locale === "ar" && c.nameAr ? c.nameAr : c.name);
  const help = [
    { href: user ? "/account/orders" : "/account/login?next=/account/orders", label: "Track my order" },
    { href: "/policies/shipping", label: "Delivery & shipping" },
    { href: "/policies/returns", label: "Returns & refunds" },
    { href: "/contact", label: "Contact us" },
  ];
  return (
    <>
      <AnnouncementBar text={announcement} />
      <header className="sticky top-0 z-40 border-b border-sand/70 bg-ivory/90 backdrop-blur-md">
        <div className="container-x grid h-[76px] grid-cols-[1fr_auto_1fr] items-center gap-4 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-2 lg:hidden">
            <MobileMenu labels={{ menu: t("nav.menu"), close: t("nav.close") }}
              prefs={<PrefsMenu currency={cur.code} currencies={currencies.map((c) => ({ code: c.code, name: c.name }))} locale={locale} setCurrency={setCurrency} setLocale={setLocale} inline />}
              groups={[
              { title: "Shop", links: [{ href: "/shop", label: t("nav.shop") }, ...cats.map((c) => ({ href: `/category/${c.slug}`, label: catName(c) }))] },
              { title: "Help", links: help },
            ]} />
            <Link href="/shop?focus=search" className="btn-icon" aria-label={t("nav.search")}><SearchIcon /></Link>
          </div>
          <Link href="/" aria-label="21mine home" className="justify-self-center lg:justify-self-start"><Logo /></Link>
          <nav aria-label="Main" className="hidden justify-self-center lg:block">
            <ul className="flex items-center gap-7">
              <NavDropdown label="Shop" wide>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">By category</p>
                    <ul className="space-y-1">{cats.map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory hover:text-charcoal">{catName(c)}</Link></li>)}</ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Discover</p>
                    <ul className="space-y-1">
                      <li><Link href="/shop" className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory">Shop all</Link></li>
                      <li><Link href="/shop?sort=newest" className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory">New in</Link></li>
                      <li><Link href="/product/discovery-set-5-x-8-ml" className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory">Fragrance discovery set</Link></li>
                      <li><Link href="/shop?stock=1" className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory">Ready to ship</Link></li>
                    </ul>
                  </div>
                </div>
              </NavDropdown>
              <li><NavLink href="/category/perfumes">{t("nav.perfumes")}</NavLink></li>
              <li><NavLink href="/category/press-on-nails">{t("nav.nails")}</NavLink></li>
              <li><NavLink href="/shop" accent>Bestsellers</NavLink></li>
              <NavDropdown label="Help">
                <ul className="space-y-1">{help.map((h) => <li key={h.href}><Link href={h.href} className="block rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ivory">{h.label}</Link></li>)}</ul>
              </NavDropdown>
            </ul>
          </nav>
          <div className="flex items-center justify-end gap-2">
            <div className="hidden sm:block">
              <PrefsMenu currency={cur.code} currencies={currencies.map((c) => ({ code: c.code, name: c.name }))} locale={locale} setCurrency={setCurrency} setLocale={setLocale} />
            </div>
            <Link href="/shop?focus=search" className="btn-icon hidden lg:grid" aria-label={t("nav.search")}><SearchIcon /></Link>
            {user && isStaff(user.role) && <Link href="/admin" className="btn-ghost hidden text-xs font-semibold xl:inline-flex">Admin</Link>}
            <Link href={user ? "/account" : "/account/login"} className="btn-icon" aria-label={user ? t("nav.account") : t("nav.signin")}><UserIcon /></Link>
            <CartButton label={t("nav.bag")} />
          </div>
        </div>
      </header>
    </>
  );
}
