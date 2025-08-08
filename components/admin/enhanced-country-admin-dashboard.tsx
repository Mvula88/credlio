"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Globe, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  DollarSign,
  FileText,
  Ban,
  Settings,
  LayoutGrid,
  Plus
} from "lucide-react"
import type { Country, SupportedCountry } from "@/lib/types/bureau"
import type { CountryStatistics, Profile } from "@/lib/types/auth"
import { formatCurrencyForCountry } from "@/lib/services/geolocation-client"

// Import modular widgets
import { ComplaintsWidget } from "./country-widgets/complaints-widget"
import { BorrowersOverviewWidget } from "./country-widgets/borrowers-overview-widget"
import { RevenueAnalyticsWidget } from "./country-widgets/revenue-analytics-widget"

interface WidgetConfig {
  id: string
  name: string
  component: React.ComponentType<{ country: SupportedCountry }>
  enabled: boolean
  order: number
}

export function EnhancedCountryAdminDashboard() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [statistics, setStatistics] = useState<CountryStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedTab, setSelectedTab] = useState("overview")
  
  // Widget configuration state
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    {
      id: "complaints",
      name: "Complaints Management",
      component: ComplaintsWidget,
      enabled: true,
      order: 1
    },
    {
      id: "borrowers",
      name: "Borrowers Overview",
      component: BorrowersOverviewWidget,
      enabled: true,
      order: 2
    },
    {
      id: "revenue",
      name: "Revenue Analytics",
      component: RevenueAnalyticsWidget,
      enabled: true,
      order: 3
    }
  ])

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryStatistics()
    }
  }, [selectedCountry])

  async function fetchUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", user.id)
        .single()

      if (profile) {
        setUserProfile(profile)

        // Since you're the only user with these roles, always grant full access
        if (profile.role === "super_admin" || profile.role === "admin" || profile.role === "country_admin") {
          fetchAllCountries()
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllCountries() {
    const { data } = await supabase
      .from("countries")
      .select("*")
      .order("name")

    if (data) {
      setCountries(data)
      if (data.length > 0 && !selectedCountry) {
        setSelectedCountry(data[0].code)
      }
    }
  }

  async function fetchCountryStatistics() {
    if (!selectedCountry) return

    setLoadingStats(true)
    try {
      const today = new Date().toISOString().split("T")[0]

      const { data: stats } = await supabase
        .from("country_statistics")
        .select("*")
        .eq("country", selectedCountry)
        .eq("date", today)
        .single()

      if (stats) {
        setStatistics(stats)
      } else {
        // Generate statistics if not exists
        await supabase.rpc("generate_country_statistics", {
          p_country: selectedCountry,
          p_date: today,
        })

        // Fetch again
        const { data: newStats } = await supabase
          .from("country_statistics")
          .select("*")
          .eq("country", selectedCountry)
          .eq("date", today)
          .single()

        setStatistics(newStats)
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  function toggleWidget(widgetId: string) {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    ))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const currentCountry = countries.find((c) => c.code === selectedCountry)
  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Country Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage country-specific operations and data
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTab("widgets")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Customize Widgets
          </Button>
          
          <Select
            value={selectedCountry || ""}
            onValueChange={(value) => setSelectedCountry(value as SupportedCountry)}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCountry && currentCountry && (
        <>
          {/* Statistics Cards */}
          {loadingStats ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : statistics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(statistics.total_borrowers + statistics.total_lenders).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.total_borrowers} borrowers • {statistics.total_lenders} lenders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.active_loans}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyForCountry(statistics.total_loan_volume, currentCountry.code)} volume
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrencyForCountry(statistics.revenue_today, currentCountry.code)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.active_subscriptions} subscriptions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risk Metrics</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.blacklisted_borrowers}</div>
                  <p className="text-xs text-muted-foreground">
                    blacklisted • {statistics.defaulted_loans} defaults
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Complaints</CardTitle>
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.total_complaints || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    pending resolution
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="loans">Loans</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
              <TabsTrigger value="widgets">Widget Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Modular Widgets */}
              <div className="grid gap-4 lg:grid-cols-2">
                {enabledWidgets.map((widget) => {
                  const WidgetComponent = widget.component
                  return (
                    <div key={widget.id}>
                      <WidgetComponent country={selectedCountry} />
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage users in {currentCountry.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      Full user list with search, filters, and actions for {currentCountry.name}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loans" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Loan Management</CardTitle>
                  <CardDescription>Monitor and manage loans in {currentCountry.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Comprehensive loan tracking and management for {currentCountry.name}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Tracking</CardTitle>
                  <CardDescription>Monitor all payments in {currentCountry.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      Payment history and analytics for {currentCountry.name}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blacklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Blacklist Management</CardTitle>
                  <CardDescription>Review blacklisted borrowers in {currentCountry.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Ban className="h-4 w-4" />
                    <AlertDescription>
                      Blacklist entries and risk management for {currentCountry.name}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="widgets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>Enable or disable widgets for your dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {widgets.map((widget) => (
                      <div key={widget.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{widget.name}</h4>
                          <p className="text-sm text-muted-foreground">Widget ID: {widget.id}</p>
                        </div>
                        <Button
                          variant={widget.enabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleWidget(widget.id)}
                        >
                          {widget.enabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Alert className="mt-4">
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Widget settings are saved locally. Add more widgets by importing them in the dashboard code.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}