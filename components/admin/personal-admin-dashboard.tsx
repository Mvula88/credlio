"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Crown, Globe, BarChart3, Users } from "lucide-react"
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

interface CountryStats {
  total_users: number
  total_loans: number
  total_payments: number
  active_borrowers: number
  active_lenders: number
}

export function PersonalAdminDashboard() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [viewMode, setViewMode] = useState<"super_admin" | "country_admin">("super_admin")
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchCountries()
  }, [])

  useEffect(() => {
    if (selectedCountry && viewMode === "country_admin") {
      fetchCountryStats(selectedCountry)
    }
  }, [selectedCountry, viewMode])

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase.from("countries").select("*").order("name")

      if (error) throw error
      setCountries(data || [])

      // Auto-select first country for country admin view
      if (data && data.length > 0) {
        setSelectedCountry(data[0].id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCountryStats = async (countryId: string) => {
    try {
      // Fetch users in this country
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id")
        .eq("country_id", countryId)

      if (usersError) throw usersError

      // Fetch loans in this country
      const { data: loans, error: loansError } = await supabase
        .from("loan_requests")
        .select("id, status")
        .eq("country_id", countryId)

      if (loansError) throw loansError

      // Fetch payments in this country
      const { data: payments, error: paymentsError } = await supabase
        .from("loan_payments")
        .select("id")
        .eq("country_id", countryId)

      if (paymentsError) throw paymentsError

      // Count active borrowers and lenders
      const { data: borrowers, error: borrowersError } = await supabase
        .from("loan_requests")
        .select("borrower_profile_id")
        .eq("country_id", countryId)
        .eq("status", "active")

      const { data: lenders, error: lendersError } = await supabase
        .from("loan_offers")
        .select("lender_profile_id")
        .eq("country_id", countryId)
        .eq("offer_status", "accepted_by_borrower")

      const uniqueBorrowers = new Set(borrowers?.map((b) => b.borrower_profile_id) || [])
      const uniqueLenders = new Set(lenders?.map((l) => l.lender_profile_id) || [])

      setCountryStats({
        total_users: users?.length || 0,
        total_loans: loans?.length || 0,
        total_payments: payments?.length || 0,
        active_borrowers: uniqueBorrowers.size,
        active_lenders: uniqueLenders.size,
      })
    } catch (err: any) {
      setError(err.message)
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Personal Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Your complete control center for Credlio</p>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View Mode:</label>
            <Select value={viewMode} onValueChange={(value: "super_admin" | "country_admin") => setViewMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Super Admin
                  </div>
                </SelectItem>
                <SelectItem value="country_admin">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Country Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Country Selector for Country Admin Mode */}
          {viewMode === "country_admin" && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Country:</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
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

      {/* Current View Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {viewMode === "super_admin" ? (
                <>
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Super Admin View</h3>
                    <p className="text-sm text-gray-600">Global platform overview and control</p>
                  </div>
                </>
              ) : (
                <>
                  <Globe className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">Country Admin View</h3>
                    <p className="text-sm text-gray-600">
                      Managing {selectedCountryData?.name} ({selectedCountryData?.code})
                    </p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={viewMode === "super_admin" ? "default" : "secondary"}>
              {viewMode === "super_admin" ? "Global Access" : "Regional Access"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {viewMode === "super_admin" ? (
            <SuperAdminOverview countries={countries} />
          ) : (
            <CountryAdminOverview country={selectedCountryData} stats={countryStats} />
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                {viewMode === "super_admin"
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
                {viewMode === "super_admin"
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
                {viewMode === "super_admin"
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
              <CardDescription>Configure your admin preferences and access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Access Control</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    You have full super admin access to all countries and features.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {countries.map((country) => (
                      <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{country.code}</Badge>
                          <span className="font-medium">{country.name}</span>
                        </div>
                        <Badge variant="default" className="bg-green-100 text-green-800">
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

function SuperAdminOverview({ countries }: { countries: Country[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Countries</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{countries.length}</div>
          <p className="text-xs text-muted-foreground">Active markets</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Global Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">Across all countries</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Admin Access</CardTitle>
          <Crown className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Full</div>
          <p className="text-xs text-muted-foreground">Super admin</p>
        </CardContent>
      </Card>
    </div>
  )
}

function CountryAdminOverview({
  country,
  stats,
}: {
  country: Country | undefined
  stats: CountryStats | null
}) {
  if (!country) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {country.name} Overview
          </CardTitle>
          <CardDescription>Regional statistics and management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.total_users || 0}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.active_borrowers || 0}</div>
              <div className="text-sm text-gray-600">Active Borrowers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats?.active_lenders || 0}</div>
              <div className="text-sm text-gray-600">Active Lenders</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats?.total_loans || 0}</div>
              <div className="text-sm text-gray-600">Total Loans</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats?.total_payments || 0}</div>
              <div className="text-sm text-gray-600">Total Payments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
