import Link from "next/link";
import { getT } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { listCategories } from "@/lib/catalog";
import { Logo } from "./Logo";
import { PaymentPills } from "./PaymentPills";

export async function Footer() {
  const [{ t, locale }, s, cats] = await Promise.all([getT(), getSettings(), listCategories()]);
  const col = (title: string, links: [string, string][]) => (
    <nav aria-label={title}>
      <h2 className="mb-4 font-display text-[15px] font-semibold text-charcoal">{title}</h2>
      <ul className="space-y-2.5 text-sm">{links.map(([href, label]) => <li key={href}><Link href={href} className="text-ink hover:text-rose">{label}</Link></li>)}</ul>
    </nav>
  );
  return (
    <footer className="mt-24 border-t border-sand bg-white">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted">{t("footer.about")} Long-lasting eaux de parfum, salon-quality press-on nails and everyday jewellery, delivered across the UAE and worldwide.</p>
          <p className="mt-4 text-sm"><a className="font-medium text-charcoal hover:text-rose" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></p>
          {s.supportPhone && <p className="text-sm text-charcoal">{s.supportPhone}</p>}
        </div>
        {col("Shop", [["/shop", "Shop all"], ["/shop?sort=newest", "New in"], ["/product/discovery-set-5-x-8-ml", "Discovery set"], ["/shop?stock=1", "Ready to ship"]])}
        {col("Categories", cats.map((c) => [`/category/${c.slug}`, locale === "ar" && c.nameAr ? c.nameAr : c.name] as [string, string]))}
        {col("Help", [["/account/orders", "Track my order"], ["/policies/shipping", t("footer.shipping")], ["/policies/returns", t("footer.returns")], ["/contact", t("nav.contact")]])}
        {col("Company", [["/policies/contact", "About 21mine"], ["/policies/terms", t("footer.terms")], ["/policies/privacy", t("footer.privacy")], ["/policies/cookies", t("footer.cookies")], ["/cookie-preferences", t("footer.cookiePrefs")]])}
      </div>
      <div className="container-x border-t border-sand py-6">
        <PaymentPills />
      </div>
      <div className="container-x flex flex-col gap-2 border-t border-sand py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {s.legalName ?? s.brandName}{s.tradeLicenceNumber ? ` · Licence ${s.tradeLicenceNumber}` : ""} · <Link href="/policies/terms" className="hover:underline">Terms</Link> · <Link href="/policies/privacy" className="hover:underline">Privacy</Link></p>
        <p>{s.businessAddress}</p>
      </div>
    </footer>
  );
}
