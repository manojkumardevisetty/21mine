import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: "21mine - Perfumes, Press-On Nails & Accessories | UAE", template: "%s | 21mine" },
  description: "Shop 21mine eaux de parfum, salon-quality press-on nails, nail care and everyday jewellery. Delivery across the UAE and worldwide.",
  openGraph: { siteName: "21mine", type: "website" },
};
export const viewport: Viewport = { themeColor: "#FAF6F0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getT();
  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
