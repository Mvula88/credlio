"use client"

import { useState, useEffect } from "react"

interface CountryInfo {
  id: string
  name: string
  code: string
  currency_code: string
  currency_symbol: string
  flag_emoji: string
  basic_price: number
  premium_price: number
  has_special_payment_logic: boolean
  special_payment_message: string | null
}

export function useCountryDetection() {
  const [country, setCountry] = useState<CountryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get country from IP
        const response = await fetch("https://ipapi.co/json/")
        const data = await response.json()

        // Map IP country codes to your supported countries
        const countryMapping: { [key: string]: string } = {
          NG: "NGA", // Nigeria
          KE: "KEN", // Kenya
          UG: "UGA", // Uganda
          ZA: "ZAF", // South Africa
          GH: "GHA", // Ghana
          TZ: "TZA", // Tanzania
          RW: "RWA", // Rwanda
          ZM: "ZMB", // Zambia
          NA: "NAM", // Namibia
          BW: "BWA", // Botswana
          MW: "MWI", // Malawi
          SN: "SEN", // Senegal
          ET: "ETH", // Ethiopia
          CM: "CMR", // Cameroon
          SL: "SLE", // Sierra Leone
          ZW: "ZWE", // Zimbabwe
        }

        const detectedCode = countryMapping[data.country_code]

        if (detectedCode) {
          // Fetch country info from your database
          const countryResponse = await fetch(`/api/countries/${detectedCode}`)
          if (countryResponse.ok) {
            const countryData = await countryResponse.json()
            setCountry(countryData)
          } else {
            throw new Error("Country not supported")
          }
        } else {
          // Default to Nigeria if country not supported
          const defaultResponse = await fetch("/api/countries/NGA")
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json()
            setCountry(defaultData)
          }
        }
      } catch (err) {
        console.error("Country detection error:", err)
        setError("Failed to detect country")

        // Fallback to Nigeria
        try {
          const fallbackResponse = await fetch("/api/countries/NGA")
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            setCountry(fallbackData)
          }
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr)
        }
      } finally {
        setLoading(false)
      }
    }

    detectCountry()
  }, [])

  return { country, loading, error }
}
