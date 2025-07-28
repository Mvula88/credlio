export const SUPPORTED_CURRENCIES = {
  NAD: {
    code: "NAD",
    symbol: "N$",
    name: "Namibian Dollar",
    country: "Namibia",
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
    case "NA": // Namibia
      return "NAD"
    default:
      return "USD"
  }
}
