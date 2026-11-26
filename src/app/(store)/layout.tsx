import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieNotice } from "@/components/CookieNotice";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link btn-primary btn-sm">Skip to content</a>
      <Header />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <CookieNotice />
    </>
  );
}
