// Client-safe geolocation utilities

// Country code mapping
const COUNTRY_CODE_MAP: Record<string, string> = {
  Nigeria: "NG",
  Kenya: "KE",
  Uganda: "UG",
  "South Africa": "ZA",
  Ghana: "GH",
  Tanzania: "TZ",
  Rwanda: "RW",
  Zambia: "ZM",
  Namibia: "NA",
  Botswana: "BW",
  Malawi: "MW",
  Senegal: "SN",
  Ethiopia: "ET",
  Cameroon: "CM",
  "Sierra Leone": "SL",
  Zimbabwe: "ZW",
  // Add variations
  NG: "NG",
  KE: "KE",
  UG: "UG",
  ZA: "ZA",
  GH: "GH",
  TZ: "TZ",
  RW: "RW",
  ZM: "ZM",
  NA: "NA",
  BW: "BW",
  MW: "MW",
  SN: "SN",
  ET: "ET",
  CM: "CM",
  SL: "SL",
  ZW: "ZW",
}

// Currency configuration for each country
const CURRENCY_CONFIG: Record<string, { code: string; symbol: string; locale: string }> = {
  NG: { code: "NGN", symbol: "₦", locale: "en-NG" },
  KE: { code: "KES", symbol: "KSh", locale: "en-KE" },
  UG: { code: "UGX", symbol: "USh", locale: "en-UG" },
  ZA: { code: "ZAR", symbol: "R", locale: "en-ZA" },
  GH: { code: "GHS", symbol: "₵", locale: "en-GH" },
  TZ: { code: "TZS", symbol: "TSh", locale: "en-TZ" },
  RW: { code: "RWF", symbol: "FRw", locale: "en-RW" },
  ZM: { code: "ZMW", symbol: "ZK", locale: "en-ZM" },
  NA: { code: "NAD", symbol: "N$", locale: "en-NA" },
  BW: { code: "BWP", symbol: "P", locale: "en-BW" },
  MW: { code: "MWK", symbol: "MK", locale: "en-MW" },
  SN: { code: "XOF", symbol: "CFA", locale: "fr-SN" },
  ET: { code: "ETB", symbol: "Br", locale: "en-ET" },
  CM: { code: "XAF", symbol: "FCFA", locale: "fr-CM" },
  SL: { code: "SLE", symbol: "Le", locale: "en-SL" },
  ZW: { code: "USD", symbol: "$", locale: "en-ZW" }, // Zimbabwe uses USD
}

export function getCountryCode(country: string): string {
  return COUNTRY_CODE_MAP[country] || country
}

export function getCountryFromCode(code: string): string {
  // First check if it's already a code
  if (COUNTRY_CODE_MAP[code]) {
    // Find the full country name
    for (const [country, countryCode] of Object.entries(COUNTRY_CODE_MAP)) {
      if (countryCode === code && country.length > 2) {
        return country
      }
    }
  }
  return code
}

export function formatCurrencyForCountry(amount: number, countryCode: string): string {
  const config = CURRENCY_CONFIG[countryCode] || CURRENCY_CONFIG.NG // Default to NGN
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // Fallback formatting
    return `${config.symbol}${amount.toLocaleString()}`
  }
}

export function getCurrencySymbol(countryCode: string): string {
  const config = CURRENCY_CONFIG[countryCode] || CURRENCY_CONFIG.NG
  return config.symbol
}

export function getCurrencyCode(countryCode: string): string {
  const config = CURRENCY_CONFIG[countryCode] || CURRENCY_CONFIG.NG
  return config.code
}