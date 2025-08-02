import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/types/auth"
import type { SupportedCountry } from "@/lib/types/bureau"

interface CountryAccessState {
  profile: Profile | null
  isLoading: boolean
  isTraveling: boolean
  canAccessCountry: (country: SupportedCountry) => boolean
  isCountryAdmin: boolean
  isSuperAdmin: boolean
  adminCountries: SupportedCountry[]
}

export function useCountryAccess(): CountryAccessState {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adminCountries, setAdminCountries] = useState<SupportedCountry[]>([])

  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/signin")
        return
      }

      // Get profile with country info
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // If country admin, fetch their assigned countries
        if (profileData.role === "country_admin") {
          const { data: countries } = await supabase
            .from("country_admins")
            .select("country")
            .eq("user_id", profileData.id)
            .eq("is_active", true)

          if (countries) {
            setAdminCountries(countries.map((c) => c.country))
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const canAccessCountry = (country: SupportedCountry): boolean => {
    if (!profile) return false

    // Super admin can access all countries
    if (profile.role === "admin") return true

    // Country admin can access their assigned countries
    if (profile.role === "country_admin" && adminCountries.includes(country)) {
      return true
    }

    // Regular users can only access their own country
    return profile.country === country
  }

  return {
    profile,
    isLoading,
    isTraveling: profile?.is_traveling || false,
    canAccessCountry,
    isCountryAdmin: profile?.role === "country_admin",
    isSuperAdmin: profile?.role === "admin",
    adminCountries,
  }
}

// Hook to enforce country-based data filtering
export function useCountryFilter<T extends { country?: SupportedCountry }>(
  data: T[] | null,
  allowCrossCountry = false
): T[] {
  const { profile, isSuperAdmin } = useCountryAccess()

  if (!data) return []
  if (!profile?.country) return []
  if (allowCrossCountry || isSuperAdmin) return data

  // Filter data by user's country
  return data.filter((item) => item.country === profile.country)
}

// Hook to check subscription access
export function useSubscriptionAccess() {
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClientComponentClient()

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const response = await fetch("/api/subscriptions/status")
      const data = await response.json()

      setHasSubscription(data.hasSubscription)
      setSubscription(data.subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const canAccessFeature = (feature: string): boolean => {
    if (!subscription) return false

    const features = subscription.features || {}

    switch (feature) {
      case "marketplace":
        return features.marketplace_access === true
      case "unlimited_reports":
        return features.max_reports_per_month === -1
      case "smart_matching":
        return features.smart_matching === true
      default:
        return false
    }
  }

  return {
    hasSubscription,
    subscription,
    isLoading,
    canAccessFeature,
    refresh: checkSubscription,
  }
}
