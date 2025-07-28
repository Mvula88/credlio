"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Crown, Globe, BarChart3, Users, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Database } from "@/lib/types/database"

interface Country {
  id: string
  name: string
  code: string
  currency_code: string
}

interface AdminStats {
  global: {
    total_countries: number
    total_users: number
    total_loans: number
    total_payments: number
  }
  country: {
    total_users: number
    total_loans: number
    total_payments: number
    active_borrowers: number
    active_lenders: number
  }
}

export function UnifiedAdminDashboard() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [viewMode, setViewMode] = useState<"global" | "country_specific">("global")
  const [stats, setStats] = useState<AdminStats>({
    global: { total_countries: 0, total_users: 0, total_loans: 0, total_payments: 0 },
    country: { total_users: 0, total_loans: 0, total_payments: 0, active_borrowers: 0, active_lenders: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    initializeDashboard()
  }, [])

  useEffect(() => {
    if (viewMode === "country_specific" && selectedCountry) {
      fetchCountryStats(selectedCountry)
    } else if (viewMode === "global") {
      fetchGlobalStats()
    }
  }, [viewMode, selectedCountry])

  const initializeDashboard = async () => {
    try {
      setLoading(true)

      // Fetch all countries
      const { data: countryData, error: countryError } = await supabase.from("countries").select("*").order("name")

      if (countryError) throw countryError
      setCountries(countryData || [])

      // Load saved preferences
      const { data: preferences, error: prefError } = await supabase
        .from("admin_country_preferences")
        .select("view_mode, preferred_country_id")
        .single()

      if (preferences && !prefError) {
        setViewMode(preferences.view_mode as "global" | "country_specific")
        if (preferences.preferred_country_id) {
          setSelectedCountry(preferences.preferred_country_id)
        }
      }

      // Set default country if none selected
      if (!selectedCountry && countryData && countryData.length > 0) {
        setSelectedCountry(countryData[0].id)
      }

      // Fetch initial stats
      await fetchGlobalStats()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobalStats = async () => {
    try {
      // Count total countries
      const { count: countryCount } = await supabase.from("countries").select("*", { count: "exact", head: true })

      // Count total users
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

      // Count total loans
      const { count: loanCount } = await supabase.from("loan_requests").select("*", { count: "exact", head: true })

      // Count total payments
      const { count: paymentCount } = await supabase.from("loan_payments").select("*", { count: "exact", head: true })

      setStats((prev) => ({
        ...prev,
        global: {
          total_countries: countryCount || 0,
          total_users: userCount || 0,
          total_loans: loanCount || 0,
          total_payments: paymentCount || 0,
        },
      }))
    } catch (err: any) {
      console.error("Error fetching global stats:", err)
    }
  }

  const fetchCountryStats = async (countryId: string) => {
    try {
      // Count users in this country
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("country_id", countryId)

      // Count loans in this country
      const { count: loanCount } = await supabase
        .from("loan_requests")
        .select("*", { count: "exact", head: true })
        .eq("country_id", countryId)

      // Count payments in this country
      const { count: paymentCount } = await supabase
        .from("loan_payments")
        .select("*", { count: "exact", head: true })
        .eq("country_id", countryId)

      // Count active borrowers
      const { data: activeBorrowers } = await supabase
        .from("loan_requests")
        .select("borrower_profile_id")
        .eq("country_id", countryId)
        .in("status", ["active", "pending"])

      // Count active lenders
      const { data: activeLenders } = await supabase
        .from("loan_offers")
        .select("lender_profile_id")
        .eq("country_id", countryId)
        .eq("offer_status", "accepted_by_borrower")

      const uniqueBorrowers = new Set(activeBorrowers?.map((b) => b.borrower_profile_id) || [])
      const uniqueLenders = new Set(activeLenders?.map((l) => l.lender_profile_id) || [])

      setStats((prev) => ({
        ...prev,
        country: {
          total_users: userCount || 0,
          total_loans: loanCount || 0,
          total_payments: paymentCount || 0,
          active_borrowers: uniqueBorrowers.size,
          active_lenders: uniqueLenders.size,
        },
      }))
    } catch (err: any) {
      console.error("Error fetching country stats:", err)
    }
  }

  const savePreferences = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (profile) {
        await supabase.from("admin_country_preferences").upsert({
          profile_id: profile.id,
          view_mode: viewMode,
          preferred_country_id: viewMode === "country_specific" ? selectedCountry : null,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err: any) {
      console.error("Error saving preferences:", err)
    }
  }

  const handleViewModeChange = (newMode: "global" | "country_specific") => {
    setViewMode(newMode)
    savePreferences()
  }

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId)
    savePreferences()
  }

  const selectedCountryData = countries.find((c) => c.id === selectedCountry)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Your Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Complete control over your Credlio platform</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">View:</label>
            <Select value={viewMode} onValueChange={handleViewModeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Global View
                  </div>
                </SelectItem>
                <SelectItem value="country_specific">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Country View
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewMode === "country_specific" && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Country:</label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{country.code}</Badge>
                        {country.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current View Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {viewMode === "global" ? (
                <>
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Global Platform View</h3>
                    <p className="text-sm text-gray-600">Managing all countries and users</p>
                  </div>
                </>
              ) : (
                <>
                  <Globe className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">Country-Specific View</h3>
                    <p className="text-sm text-gray-600">
                      Focused on {selectedCountryData?.name} ({selectedCountryData?.code})
                    </p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={viewMode === "global" ? "default" : "secondary"}>
              {viewMode === "global" ? "Global Access" : "Regional Focus"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {viewMode === "global" ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.global.total_countries}</div>
                <p className="text-xs text-muted-foreground">Active markets</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.global.total_users}</div>
                <p className="text-xs text-muted-foreground">All countries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.global.total_loans}</div>
                <p className="text-xs text-muted-foreground">Platform wide</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.global.total_payments}</div>
                <p className="text-xs text-muted-foreground">All transactions</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.country.total_users}</div>
                <p className="text-xs text-muted-foreground">In {selectedCountryData?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Borrowers</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.country.active_borrowers}</div>
                <p className="text-xs text-muted-foreground">Currently borrowing</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Lenders</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.country.active_lenders}</div>
                <p className="text-xs text-muted-foreground">Currently lending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.country.total_loans}</div>
                <p className="text-xs text-muted-foreground">In this country</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
              <CardDescription>
                {viewMode === "global"
                  ? "Global platform statistics and insights"
                  : `Detailed view of ${selectedCountryData?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                {viewMode === "global"
                  ? "You're viewing global platform data across all countries."
                  : `You're viewing data specific to ${selectedCountryData?.name}.`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                {viewMode === "global"
                  ? "Manage all users across all countries"
                  : `Manage users in ${selectedCountryData?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">User management interface will be loaded here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <CardHeader>
              <CardTitle>Loan Management</CardTitle>
              <CardDescription>
                {viewMode === "global"
                  ? "Manage all loans across all countries"
                  : `Manage loans in ${selectedCountryData?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Loan management interface will be loaded here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                {viewMode === "global"
                  ? "Manage all payments across all countries"
                  : `Manage payments in ${selectedCountryData?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Payment management interface will be loaded here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>Your admin preferences and platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Your Access Level</h4>
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium text-yellow-800">Super Administrator</div>
                      <div className="text-sm text-yellow-700">Full platform access and control</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Available Countries</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {countries.map((country) => (
                      <div key={country.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{country.code}</Badge>
                          <span className="text-sm">{country.name}</span>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          Full Access
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
