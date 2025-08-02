"use client"

import { Globe, MapPin, Plane } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SupportedCountry } from "@/lib/types/bureau"

interface CountryInfoBadgeProps {
  country: SupportedCountry
  countryName?: string
  showIcon?: boolean
  variant?: "default" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
}

const countryData: Record<SupportedCountry, { name: string; flag: string }> = {
  NG: { name: "Nigeria", flag: "🇳🇬" },
  KE: { name: "Kenya", flag: "🇰🇪" },
  UG: { name: "Uganda", flag: "🇺🇬" },
  ZA: { name: "South Africa", flag: "🇿🇦" },
  GH: { name: "Ghana", flag: "🇬🇭" },
  TZ: { name: "Tanzania", flag: "🇹🇿" },
  RW: { name: "Rwanda", flag: "🇷🇼" },
  ZM: { name: "Zambia", flag: "🇿🇲" },
  NA: { name: "Namibia", flag: "🇳🇦" },
  BW: { name: "Botswana", flag: "🇧🇼" },
  MW: { name: "Malawi", flag: "🇲🇼" },
  SN: { name: "Senegal", flag: "🇸🇳" },
  ET: { name: "Ethiopia", flag: "🇪🇹" },
  CM: { name: "Cameroon", flag: "🇨🇲" },
  SL: { name: "Sierra Leone", flag: "🇸🇱" },
  ZW: { name: "Zimbabwe", flag: "🇿🇼" },
}

export function CountryInfoBadge({
  country,
  countryName,
  showIcon = true,
  variant = "secondary",
  size = "md",
}: CountryInfoBadgeProps) {
  const data = countryData[country]
  if (!data) return null

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Badge variant={variant} className={`${sizeClasses[size]} inline-flex items-center gap-1.5`}>
      {showIcon && <MapPin className={iconSizes[size]} />}
      <span>{data.flag}</span>
      <span>{countryName || data.name}</span>
    </Badge>
  )
}

interface TravelBannerProps {
  homeCountry: SupportedCountry
  currentCountry: SupportedCountry
  onUpdateCountry?: () => void
}

export function TravelBanner({ homeCountry, currentCountry, onUpdateCountry }: TravelBannerProps) {
  const homeData = countryData[homeCountry]
  const currentData = countryData[currentCountry]

  if (!homeData || !currentData || homeCountry === currentCountry) return null

  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Plane className="h-4 w-4" />
          <span>
            You're traveling! Your home country is {homeData.flag} {homeData.name}, but you're
            currently in {currentData.flag} {currentData.name}.
          </span>
        </div>
        {onUpdateCountry && (
          <button
            onClick={onUpdateCountry}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            Update location
          </button>
        )}
      </div>
    </div>
  )
}

interface CountrySelectorProps {
  selectedCountry?: SupportedCountry
  onSelect: (country: SupportedCountry) => void
  showAll?: boolean
  allowedCountries?: SupportedCountry[]
}

export function CountrySelector({
  selectedCountry,
  onSelect,
  showAll = true,
  allowedCountries,
}: CountrySelectorProps) {
  const countries = showAll
    ? Object.entries(countryData)
    : Object.entries(countryData).filter(([code]) =>
        allowedCountries?.includes(code as SupportedCountry)
      )

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {countries.map(([code, data]) => (
        <button
          key={code}
          onClick={() => onSelect(code as SupportedCountry)}
          className={`
            rounded-lg border-2 p-3 transition-all
            ${
              selectedCountry === code
                ? "border-primary bg-primary/10"
                : "border-gray-200 hover:border-gray-300"
            }
          `}
        >
          <div className="mb-1 text-2xl">{data.flag}</div>
          <div className="text-sm font-medium">{data.name}</div>
          <div className="text-xs text-muted-foreground">{code}</div>
        </button>
      ))}
    </div>
  )
}
