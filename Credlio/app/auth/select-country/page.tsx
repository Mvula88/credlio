"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Globe, Loader2, MapPin } from "lucide-react"
import type { Country, SupportedCountry } from "@/lib/types/bureau"

export default function SelectCountryPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState<SupportedCountry | null>(null)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchCountries()
    detectCountry()
  }, [])

  async function fetchCountries() {
    try {
      const { data } = await supabase.from("countries").select("*").eq("active", true).order("name")

      setCountries(data || [])
    } catch (error) {
      console.error("Error fetching countries:", error)
    } finally {
      setLoading(false)
    }
  }

  async function detectCountry() {
    try {
      const response = await fetch("/api/geolocation")
      const data = await response.json()

      if (data.country) {
        setDetectedCountry(data.country)
        setSelectedCountry(data.country)
      }
    } catch (error) {
      console.error("Error detecting country:", error)
    }
  }

  async function handleSelectCountry() {
    if (!selectedCountry) return

    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("No authenticated user")
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) {
        throw new Error("Profile not found")
      }

      // Update profile with country
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          country: selectedCountry,
          home_country: selectedCountry,
        })
        .eq("id", profile.id)

      if (updateError) throw updateError

      // Propagate country to related records
      await supabase.rpc("propagate_user_country", { p_user_id: profile.id })

      // Redirect based on role
      switch (profile.role) {
        case "borrower":
          router.push("/borrower/dashboard")
          break
        case "lender":
          router.push("/lender/dashboard")
          break
        case "admin":
          router.push("/admin/dashboard")
          break
        default:
          router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Error setting country:", error)
      setError(error.message || "Failed to set country")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Globe className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Select Your Country</CardTitle>
          <CardDescription>
            Choose your country to continue. This helps us provide localized services and connect
            you with users in your region.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detectedCountry && (
            <Alert className="mb-6">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                We detected you're in{" "}
                <strong>{countries.find((c) => c.code === detectedCountry)?.name}</strong>. You can
                select a different country if needed.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {countries.map((country) => (
              <Button
                key={country.code}
                variant={selectedCountry === country.code ? "default" : "outline"}
                className="flex h-auto flex-col items-center justify-center gap-2 px-3 py-4"
                onClick={() => setSelectedCountry(country.code)}
              >
                <span className="text-2xl">{country.flag}</span>
                <span className="text-center text-xs">{country.name}</span>
              </Button>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={handleSelectCountry}
              disabled={!selectedCountry || saving}
              className="min-w-[200px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Country...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              You can change your country later in your profile settings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
