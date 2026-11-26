export const UAE_EMIRATES = [
  "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah",
] as const;

// Countries offered in the address form. Delivery is only possible where an enabled zone exists.
export const COUNTRIES: { code: string; name: string; postal: boolean }[] = [
  { code: "AE", name: "United Arab Emirates", postal: false },
  { code: "SA", name: "Saudi Arabia", postal: true },
  { code: "QA", name: "Qatar", postal: false },
  { code: "KW", name: "Kuwait", postal: true },
  { code: "BH", name: "Bahrain", postal: false },
  { code: "OM", name: "Oman", postal: true },
  { code: "IN", name: "India", postal: true },
  { code: "PK", name: "Pakistan", postal: true },
  { code: "GB", name: "United Kingdom", postal: true },
  { code: "DE", name: "Germany", postal: true },
  { code: "FR", name: "France", postal: true },
  { code: "IT", name: "Italy", postal: true },
  { code: "ES", name: "Spain", postal: true },
  { code: "NL", name: "Netherlands", postal: true },
  { code: "US", name: "United States", postal: true },
  { code: "CA", name: "Canada", postal: true },
  { code: "AU", name: "Australia", postal: true },
  { code: "SG", name: "Singapore", postal: true },
];

export const countryName = (code: string) => COUNTRIES.find((c) => c.code === code)?.name ?? code;
