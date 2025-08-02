export const SUPPORTED_CURRENCIES = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    country: "Nigeria",
  },
  KES: {
    code: "KES",
    symbol: "KSh",
    name: "Kenyan Shilling",
    country: "Kenya",
  },
  UGX: {
    code: "UGX",
    symbol: "USh",
    name: "Ugandan Shilling",
    country: "Uganda",
  },
  ZAR: {
    code: "ZAR",
    symbol: "R",
    name: "Rand",
    country: "South Africa",
  },
  GHS: {
    code: "GHS",
    symbol: "GH₵",
    name: "Ghanaian Cedi",
    country: "Ghana",
  },
  TZS: {
    code: "TZS",
    symbol: "TSh",
    name: "Tanzanian Shilling",
    country: "Tanzania",
  },
  RWF: {
    code: "RWF",
    symbol: "FRw",
    name: "Rwandan Franc",
    country: "Rwanda",
  },
  ZMW: {
    code: "ZMW",
    symbol: "K",
    name: "Zambian Kwacha",
    country: "Zambia",
  },
  NAD: {
    code: "NAD",
    symbol: "N$",
    name: "Namibian Dollar",
    country: "Namibia",
  },
  BWP: {
    code: "BWP",
    symbol: "P",
    name: "Botswana Pula",
    country: "Botswana",
  },
  MWK: {
    code: "MWK",
    symbol: "MK",
    name: "Malawian Kwacha",
    country: "Malawi",
  },
  XOF: {
    code: "XOF",
    symbol: "CFA",
    name: "CFA Franc",
    country: "Senegal",
  },
  ETB: {
    code: "ETB",
    symbol: "Br",
    name: "Ethiopian Birr",
    country: "Ethiopia",
  },
  XAF: {
    code: "XAF",
    symbol: "FCFA",
    name: "CFA Franc",
    country: "Cameroon",
  },
  SLL: {
    code: "SLL",
    symbol: "Le",
    name: "Sierra Leonean Leone",
    country: "Sierra Leone",
  },
  ZWL: {
    code: "ZWL",
    symbol: "Z$",
    name: "Zimbabwean Dollar",
    country: "Zimbabwe",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    country: "International",
  },
} as const

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency]
  return `${currencyInfo.symbol}${amount.toFixed(2)}`
}

export function getCurrencyByCountry(countryCode: string): SupportedCurrency {
  switch (countryCode) {
    case "NG": // Nigeria
      return "NGN"
    case "KE": // Kenya
      return "KES"
    case "UG": // Uganda
      return "UGX"
    case "ZA": // South Africa
      return "ZAR"
    case "GH": // Ghana
      return "GHS"
    case "TZ": // Tanzania
      return "TZS"
    case "RW": // Rwanda
      return "RWF"
    case "ZM": // Zambia
      return "ZMW"
    case "NA": // Namibia
      return "NAD"
    case "BW": // Botswana
      return "BWP"
    case "MW": // Malawi
      return "MWK"
    case "SN": // Senegal
      return "XOF"
    case "ET": // Ethiopia
      return "ETB"
    case "CM": // Cameroon
      return "XAF"
    case "SL": // Sierra Leone
      return "SLL"
    case "ZW": // Zimbabwe
      return "ZWL"
    default:
      return "USD"
  }
}
