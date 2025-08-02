// Centralized list of supported countries
export const SUPPORTED_COUNTRIES = [
  { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { code: "UG", name: "Uganda", currency: "UGX", flag: "🇺🇬" },
  { code: "ZA", name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
  { code: "TZ", name: "Tanzania", currency: "TZS", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda", currency: "RWF", flag: "🇷🇼" },
  { code: "ZM", name: "Zambia", currency: "ZMW", flag: "🇿🇲" },
  { code: "NA", name: "Namibia", currency: "NAD", flag: "🇳🇦" },
  { code: "BW", name: "Botswana", currency: "BWP", flag: "🇧🇼" },
  { code: "MW", name: "Malawi", currency: "MWK", flag: "🇲🇼" },
  { code: "SN", name: "Senegal", currency: "XOF", flag: "🇸🇳" },
  { code: "ET", name: "Ethiopia", currency: "ETB", flag: "🇪🇹" },
  { code: "CM", name: "Cameroon", currency: "XAF", flag: "🇨🇲" },
  { code: "SL", name: "Sierra Leone", currency: "SLL", flag: "🇸🇱" },
  { code: "ZW", name: "Zimbabwe", currency: "ZWL", flag: "🇿🇼" },
] as const;

// Get country by code
export function getCountryByCode(code: string) {
  return SUPPORTED_COUNTRIES.find(country => country.code === code);
}

// Get country name by code
export function getCountryName(code: string): string {
  const country = getCountryByCode(code);
  return country?.name || code;
}

// Check if country is supported
export function isCountrySupported(code: string): boolean {
  return SUPPORTED_COUNTRIES.some(country => country.code === code);
}

// Get currency for country
export function getCountryCurrency(code: string): string {
  const country = getCountryByCode(code);
  return country?.currency || 'USD';
}

// For backward compatibility
export const countries = SUPPORTED_COUNTRIES;