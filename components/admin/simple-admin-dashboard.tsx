"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, DollarSign, FileText, TrendingUp, Globe, MapPin } from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalLoans: number
  totalPayments: number
  totalRevenue: number
  activeCountries: number
  pendingLoans: number
}

interface Country {
  code: string
  name: string
  userCount: number
}

interface AdminDashboardProps {
  initialView?: "super_admin" | "country_admin"
  initialCountry?: string
}

export default function SimpleAdminDashboard({ initialView = "super_admin", initialCountry }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<"super_admin" | "country_admin">(initialView)
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry || "")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load admin stats
  useEffect(() => {
    loadStats()
  }, [currentView, selectedCountry])

  // Load countries list
  useEffect(() => {
    loadCountries()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        view: currentView,
        ...(selectedCountry && { country: selectedCountry }),
      })

      const response = await fetch(`/api/admin/stats?${params}`)
      if (!response.ok) throw new Error("Failed to load stats")

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats")
    } finally {
      setLoading(false)
    }
  }

  const loadCountries = async () => {
    try {
      const response = await fetch("/api/admin/countries")
      if (!response.ok) throw new Error("Failed to load countries")

      const data = await response.json()
      setCountries(data)
    } catch (err) {
      console.error("Failed to load countries:", err)
    }
  }

  const switchView = async (newView: "super_admin" | "country_admin") => {
    try {
      await fetch("/api/admin/switch-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          view: newView,
          country: newView === "country_admin" ? selectedCountry : null,
        }),
      })

      setCurrentView(newView)
      if (newView === "super_admin") {
        setSelectedCountry("")
      }
    } catch (err) {
      setError("Failed to switch view")
    }
  }

  const selectCountry = async (countryCode: string) => {
    try {
      await fetch("/api/admin/switch-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          view: currentView,
          country: countryCode,
        }),
      })

      setSelectedCountry(countryCode)
    } catch (err) {
      setError("Failed to select country")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  const selectedCountryName = countries.find((c) => c.code === selectedCountry)?.name || selectedCountry

  return (
    <div className="space-y-6">
      {/* Admin Role Switcher */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {currentView === "super_admin"
              ? "Global platform management"
              : `Managing ${selectedCountryName || "Select a country"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={currentView === "super_admin" ? "default" : "outline"}
            onClick={() => switchView("super_admin")}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            Super Admin
          </Button>
          <Button
            variant={currentView === "country_admin" ? "default" : "outline"}
            onClick={() => switchView("country_admin")}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Country Admin
          </Button>
        </div>
      </div>

      {/* Country Selector for Country Admin */}
      {currentView === "country_admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select Country
            </CardTitle>
            <CardDescription>Choose which country you want to manage</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCountry} onValueChange={selectCountry}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center justify-between w-full">
                      <span>{country.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {country.userCount} users
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {currentView === "super_admin" ? "Platform-wide" : `In ${selectedCountryName}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.pendingLoans || 0} pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">Payment transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue || 0}</div>
            <p className="text-xs text-muted-foreground">
              {currentView === "super_admin" ? "All countries" : selectedCountryName}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentView === "super_admin" ? "Platform Overview" : `${selectedCountryName} Overview`}
              </CardTitle>
              <CardDescription>
                {currentView === "super_admin"
                  ? "Global statistics and platform health"
                  : "Country-specific statistics and performance"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Quick Stats</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Active Users:</span>
                      <span className="font-medium">{stats?.totalUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Loans:</span>
                      <span className="font-medium">{stats?.totalLoans || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Payments:</span>
                      <span className="font-medium">{stats?.totalPayments || 0}</span>
                    </div>
                    {currentView === "super_admin" && (
                      <div className="flex justify-between">
                        <span>Active Countries:</span>
                        <span className="font-medium">{stats?.activeCountries || 0}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Recent Activity</h4>
                  <div className="text-sm text-gray-600">
                    <p>• New user registrations: Daily</p>
                    <p>• Loan requests: Active</p>
                    <p>• Payment processing: Normal</p>
                    <p>• System status: Operational</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users {currentView === "country_admin" ? `in ${selectedCountryName}` : "across all countries"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">User management interface coming soon</p>
                <Button variant="outline">View All Users</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Management</CardTitle>
              <CardDescription>
                Manage loan requests and approvals{" "}
                {currentView === "country_admin" ? `in ${selectedCountryName}` : "globally"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Loan management interface coming soon</p>
                <Button variant="outline">View All Loans</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                Monitor and manage payments {currentView === "country_admin" ? `in ${selectedCountryName}` : "globally"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Payment management interface coming soon</p>
                <Button variant="outline">View All Payments</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>Configure your admin preferences and view settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Current Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Admin Mode:</span>
                      <Badge variant={currentView === "super_admin" ? "default" : "secondary"}>
                        {currentView === "super_admin" ? "Super Admin" : "Country Admin"}
                      </Badge>
                    </div>
                    {currentView === "country_admin" && selectedCountry && (
                      <div className="flex justify-between">
                        <span>Selected Country:</span>
                        <Badge variant="outline">{selectedCountryName}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="text-gray-600">{new Date().toLocaleDateString()}</span>
                    </div>
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
