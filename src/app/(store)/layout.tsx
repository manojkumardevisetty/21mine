import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieNotice } from "@/components/CookieNotice";
import { getT } from "@/lib/i18n";
import { isDemo } from "@/lib/env";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <>
      <a href="#main" className="skip-link btn-primary btn-sm">Skip to content</a>
      {isDemo() && (
        <div className="bg-rose-deep px-4 py-1.5 text-center text-xs text-white" role="note">{t("demo.banner")}</div>
      )}
      <Header />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <CookieNotice />
    </>
  );
}
