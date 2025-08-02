import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { headers } from "next/headers"

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

interface GeolocationData {
  ip: string
  country: string
  city?: string
  region?: string
  loc?: string
  timezone?: string
}

export async function getClientIP(): Promise<string | null> {
  const headersList = headers()

  // Check various headers for IP
  const forwardedFor = headersList.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIP = headersList.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = headersList.get("cf-connecting-ip")
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return null
}

export async function getGeolocationData(ip: string): Promise<GeolocationData | null> {
  try {
    // Using IPinfo.io free tier (50k requests/month)
    // In production, you should use your own API key
    const response = await fetch(`https://ipinfo.io/${ip}/json`, {
      headers: {
        Accept: "application/json",
        // Add your IPinfo token here for production
        // 'Authorization': 'Bearer YOUR_IPINFO_TOKEN'
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      console.error("Geolocation API error:", response.status)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching geolocation:", error)
    return null
  }
}

export async function detectUserCountry(userId: string): Promise<{
  country: string | null
  isSupported: boolean
  isTraveling: boolean
  homeCountry: string | null
}> {
  const ip = await getClientIP()

  if (!ip) {
    return {
      country: null,
      isSupported: false,
      isTraveling: false,
      homeCountry: null,
    }
  }

  const geoData = await getGeolocationData(ip)

  if (!geoData) {
    return {
      country: null,
      isSupported: false,
      isTraveling: false,
      homeCountry: null,
    }
  }

  // Map country name to our supported country codes
  const detectedCountryCode =
    COUNTRY_CODE_MAP[geoData.country] || COUNTRY_CODE_MAP[geoData.country.split(" ")[0]]

  if (!detectedCountryCode) {
    return {
      country: geoData.country,
      isSupported: false,
      isTraveling: false,
      homeCountry: null,
    }
  }

  // Update user's country in database
  const supabase = createServerSupabaseClient()

  const { data: result } = await supabase.rpc("update_user_country_from_ip", {
    p_user_id: userId,
    p_ip_address: ip,
    p_detected_country: detectedCountryCode,
    p_city: geoData.city,
    p_region: geoData.region,
    p_geolocation_data: geoData,
  })

  return {
    country: detectedCountryCode,
    isSupported: true,
    isTraveling: result?.is_traveling || false,
    homeCountry: result?.home_country || detectedCountryCode,
  }
}

export async function getUserCountryInfo(userId: string) {
  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("country, home_country, is_traveling, detected_country")
    .eq("id", userId)
    .single()

  if (!profile) {
    return null
  }

  const { data: countryData } = await supabase
    .from("countries")
    .select("*")
    .eq("code", profile.country || profile.home_country)
    .single()

  return {
    ...profile,
    countryInfo: countryData,
  }
}

// Middleware function to enforce country-based access
export async function enforceCountryAccess(
  userId: string,
  targetCountry: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("country, role")
    .eq("id", userId)
    .single()

  if (!profile) {
    return false
  }

  // Super admins can access any country
  if (profile.role === "admin") {
    return true
  }

  // Check if user is a country admin for the target country
  const { data: countryAdmin } = await supabase
    .from("country_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("country", targetCountry)
    .eq("is_active", true)
    .single()

  if (countryAdmin) {
    return true
  }

  // Regular users can only access their own country
  return profile.country === targetCountry
}

// Get supported countries list
export async function getSupportedCountries() {
  const supabase = createServerSupabaseClient()

  const { data: countries } = await supabase
    .from("countries")
    .select("*")
    .eq("active", true)
    .order("name")

  return countries || []
}

// Function to format currency based on country
// Detect country from IP address without headers dependency
export async function detectCountryFromIP(
  ip: string,
  userId: string
): Promise<{
  country: string | null
  isSupported: boolean
  detectedCountry: string | null
  city?: string
  region?: string
}> {
  try {
    const geoData = await getGeolocationData(ip)

    if (!geoData) {
      return {
        country: null,
        isSupported: false,
        detectedCountry: null,
      }
    }

    // Map country name to our supported country codes
    const detectedCountryCode =
      COUNTRY_CODE_MAP[geoData.country] || COUNTRY_CODE_MAP[geoData.country.split(" ")[0]]

    if (!detectedCountryCode) {
      return {
        country: null,
        isSupported: false,
        detectedCountry: geoData.country,
        city: geoData.city,
        region: geoData.region,
      }
    }

    // Update user's country detection in database
    const supabase = createServerSupabaseClient()

    await supabase.rpc("update_user_country_from_ip", {
      p_user_id: userId,
      p_ip_address: ip,
      p_detected_country: detectedCountryCode,
      p_city: geoData.city,
      p_region: geoData.region,
      p_geolocation_data: geoData,
    })

    return {
      country: detectedCountryCode,
      isSupported: true,
      detectedCountry: detectedCountryCode,
      city: geoData.city,
      region: geoData.region,
    }
  } catch (error) {
    console.error("Error detecting country from IP:", error)
    return {
      country: null,
      isSupported: false,
      detectedCountry: null,
    }
  }
}

export function formatCurrencyForCountry(amount: number, countryCode: string): string {
  const currencyMap: Record<string, { code: string; symbol: string; locale: string }> = {
    NG: { code: "NGN", symbol: "₦", locale: "en-NG" },
    KE: { code: "KES", symbol: "KSh", locale: "en-KE" },
    UG: { code: "UGX", symbol: "USh", locale: "en-UG" },
    ZA: { code: "ZAR", symbol: "R", locale: "en-ZA" },
    GH: { code: "GHS", symbol: "GH₵", locale: "en-GH" },
    TZ: { code: "TZS", symbol: "TSh", locale: "en-TZ" },
    RW: { code: "RWF", symbol: "FRw", locale: "en-RW" },
    ZM: { code: "ZMW", symbol: "K", locale: "en-ZM" },
    NA: { code: "NAD", symbol: "N$", locale: "en-NA" },
    BW: { code: "BWP", symbol: "P", locale: "en-BW" },
    MW: { code: "MWK", symbol: "MK", locale: "en-MW" },
    SN: { code: "XOF", symbol: "CFA", locale: "fr-SN" },
    ET: { code: "ETB", symbol: "Br", locale: "en-ET" },
    CM: { code: "XAF", symbol: "FCFA", locale: "fr-CM" },
    SL: { code: "SLL", symbol: "Le", locale: "en-SL" },
    ZW: { code: "ZWL", symbol: "Z$", locale: "en-ZW" },
  }

  const currency = currencyMap[countryCode] || { code: "USD", symbol: "$", locale: "en-US" }

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // Fallback to symbol + amount
    return `${currency.symbol}${amount.toLocaleString()}`
  }
}
