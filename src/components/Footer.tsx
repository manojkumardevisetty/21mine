import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { Logo } from "./Logo";

export async function Footer() {
  const [{ t }, s] = await Promise.all([getT(), getSettings()]);
  return (
    <footer className="mt-24 bg-charcoal text-ivory/85">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-ivory/70">{t("footer.about")}</p>
          <p className="mt-4 text-sm"><a className="hover:text-white" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></p>
          {s.supportPhone && <p className="text-sm">{s.supportPhone}</p>}
        </div>
        <nav aria-label={t("footer.shop")}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ivory/60">{t("footer.shop")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/category/perfumes" className="hover:text-white">{t("nav.perfumes")}</Link></li>
            <li><Link href="/category/press-on-nails" className="hover:text-white">{t("nav.nails")}</Link></li>
            <li><Link href="/category/nail-care" className="hover:text-white">{t("nav.nailcare")}</Link></li>
            <li><Link href="/category/jewellery" className="hover:text-white">{t("nav.jewellery")}</Link></li>
            <li><Link href="/category/hair-accessories" className="hover:text-white">Hair Accessories</Link></li>
            <li><Link href="/category/fashion-accessories" className="hover:text-white">{t("nav.accessories")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("footer.help")}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ivory/60">{t("footer.help")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/contact" className="hover:text-white">{t("nav.contact")}</Link></li>
            <li><Link href="/policies/shipping" className="hover:text-white">{t("footer.shipping")}</Link></li>
            <li><Link href="/policies/returns" className="hover:text-white">{t("footer.returns")}</Link></li>
            <li><Link href="/account" className="hover:text-white">{t("nav.account")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("footer.legal")}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ivory/60">{t("footer.legal")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/policies/terms" className="hover:text-white">{t("footer.terms")}</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-white">{t("footer.privacy")}</Link></li>
            <li><Link href="/policies/cookies" className="hover:text-white">{t("footer.cookies")}</Link></li>
            <li><Link href="/cookie-preferences" className="hover:text-white">{t("footer.cookiePrefs")}</Link></li>
            <li><Link href="/policies/contact" className="hover:text-white">{t("footer.contact")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {s.legalName ?? s.brandName}{s.tradeLicenceNumber ? ` · Trade licence ${s.tradeLicenceNumber}` : ""}{s.licenceAuthority ? ` · ${s.licenceAuthority}` : ""}</p>
          <p>{s.businessAddress}</p>
        </div>
      </div>
    </footer>
  );
}
