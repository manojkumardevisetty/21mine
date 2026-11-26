import { cookies } from "next/headers";

export type Locale = "en" | "ar";
export const LOCALE_COOKIE = "locale";

const en = {
  "nav.shop": "Shop all", "nav.perfumes": "Perfumes", "nav.nails": "Press-On Nails", "nav.nailcare": "Nail Care",
  "nav.jewellery": "Jewellery", "nav.accessories": "Accessories", "nav.account": "Account", "nav.bag": "Bag",
  "nav.search": "Search", "nav.menu": "Menu", "nav.close": "Close", "nav.contact": "Contact", "nav.signin": "Sign in",
  "search.placeholder": "Search perfumes, nails, jewellery…",
  "common.addToBag": "Add to bag", "common.outOfStock": "Out of stock", "common.inStock": "In stock",
  "common.lowStock": "Only {n} left", "common.from": "From", "common.viewBag": "View bag", "common.checkout": "Checkout",
  "common.continueShopping": "Continue shopping", "common.save": "Save", "common.cancel": "Cancel", "common.remove": "Remove",
  "footer.help": "Customer care", "footer.shop": "Shop", "footer.legal": "Legal", "footer.about": "Fragrance, nails and accessories, curated in Dubai.",
  "footer.terms": "Terms of Sale", "footer.privacy": "Privacy Policy", "footer.cookies": "Cookie Policy", "footer.cookiePrefs": "Cookie preferences",
  "footer.shipping": "Shipping & Delivery", "footer.returns": "Returns & Refunds", "footer.contact": "Contact & Business Info",
  "demo.banner": "Demo mode: payments are simulated and no money is collected.",
  "currency.label": "Currency", "language.label": "Language",
  "home.hero.title": "Scent, shine and the finishing touch.",
  "home.hero.sub": "Eaux de parfum, salon-quality press-on nails and everyday jewellery - delivered across the UAE and worldwide.",
  "home.hero.cta": "Shop the collection", "home.categories": "Shop by category", "home.featured": "Customer favourites",
} as const;

export type DictKey = keyof typeof en;

const ar: Record<DictKey, string> = {
  "nav.shop": "تسوقي الكل", "nav.perfumes": "العطور", "nav.nails": "أظافر جاهزة", "nav.nailcare": "العناية بالأظافر",
  "nav.jewellery": "المجوهرات", "nav.accessories": "الإكسسوارات", "nav.account": "حسابي", "nav.bag": "الحقيبة",
  "nav.search": "بحث", "nav.menu": "القائمة", "nav.close": "إغلاق", "nav.contact": "تواصل معنا", "nav.signin": "تسجيل الدخول",
  "search.placeholder": "ابحثي عن العطور والأظافر والمجوهرات…",
  "common.addToBag": "أضيفي إلى الحقيبة", "common.outOfStock": "غير متوفر", "common.inStock": "متوفر",
  "common.lowStock": "تبقى {n} فقط", "common.from": "ابتداءً من", "common.viewBag": "عرض الحقيبة", "common.checkout": "إتمام الشراء",
  "common.continueShopping": "متابعة التسوق", "common.save": "حفظ", "common.cancel": "إلغاء", "common.remove": "إزالة",
  "footer.help": "خدمة العملاء", "footer.shop": "تسوقي", "footer.legal": "قانوني", "footer.about": "عطور وأظافر وإكسسوارات مختارة في دبي.",
  "footer.terms": "شروط البيع", "footer.privacy": "سياسة الخصوصية", "footer.cookies": "سياسة ملفات الارتباط", "footer.cookiePrefs": "تفضيلات ملفات الارتباط",
  "footer.shipping": "الشحن والتوصيل", "footer.returns": "الإرجاع والاسترداد", "footer.contact": "التواصل ومعلومات الشركة",
  "demo.banner": "وضع تجريبي: المدفوعات محاكاة ولا يتم تحصيل أي مبلغ.",
  "currency.label": "العملة", "language.label": "اللغة",
  "home.hero.title": "عطرٌ وبريقٌ ولمسةٌ أخيرة.",
  "home.hero.sub": "عطور أو دو بارفان، وأظافر جاهزة بجودة الصالونات، ومجوهرات يومية - توصيل في جميع أنحاء الإمارات والعالم.",
  "home.hero.cta": "تسوقي المجموعة", "home.categories": "تسوقي حسب الفئة", "home.featured": "المفضلة لدى عميلاتنا",
};

const dicts: Record<Locale, Record<DictKey, string>> = { en, ar };

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ar" ? "ar" : "en";
}

export async function getT() {
  const locale = await getLocale();
  const d = dicts[locale];
  return {
    locale,
    dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    t: (k: DictKey, vars?: Record<string, string | number>) =>
      Object.entries(vars ?? {}).reduce((s, [key, v]) => s.replace(`{${key}}`, String(v)), d[k] ?? en[k]),
  };
}
