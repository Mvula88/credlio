"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, 
  Globe, 
  Users, 
  Shield, 
  TrendingUp, 
  Settings, 
  AlertCircle,
  DollarSign,
  FileText,
  Ban,
  CreditCard,
  Activity,
  PieChart,
  BarChart3
} from "lucide-react"
import type { Country, SupportedCountry } from "@/lib/types/bureau"
import type { CountryStatistics } from "@/lib/types/auth"
import { formatCurrencyForCountry } from "@/lib/services/geolocation-client"

interface GlobalStatistics {
  totalUsers: number
  totalBorrowers: number
  totalLenders: number
  totalActiveLoans: number
  totalLoanVolume: number
  totalRevenue: number
  totalBlacklisted: number
  totalActiveSubscriptions: number
  totalComplaints: number
  totalRepayments: number
  repaymentRate: number
  defaultRate: number
  countryBreakdown: Array<{
    country: SupportedCountry
    users: number
    borrowers: number
    lenders: number
    loans: number
    revenue: number
    complaints: number
    blacklisted: number
  }>
}

export function EnhancedSuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [globalStats, setGlobalStats] = useState<GlobalStatistics | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedTab, setSelectedTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("today")
  const [complaints, setComplaints] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const supabase = getSupabaseClient()

  useEffect(() => {
    checkSuperAdminAccess()
  }, [])

  useEffect(() => {
    if (globalStats) {
      fetchAdditionalData()
    }
  }, [timeRange])

  async function checkSuperAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (profile?.role === "super_admin" || profile?.role === "admin") {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }

  async function fetchDashboardData() {
    try {
      // Fetch all countries
      const { data: countryData } = await supabase
        .from("countries")
        .select("*")
        .order("name")

      setCountries(countryData || [])

      // Fetch global statistics
      await fetchGlobalStatistics()
      
      // Fetch complaints
      await fetchComplaints()
      
      // Fetch recent activity
      await fetchRecentActivity()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGlobalStatistics() {
    const today = new Date().toISOString().split("T")[0]

    // Fetch statistics for all countries
    const { data: allStats } = await supabase
      .from("country_statistics")
      .select("*")
      .eq("date", today)

    // Fetch additional data
    const { data: allComplaints } = await supabase
      .from("complaints")
      .select("id")
    
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount, status")

    if (allStats) {
      const globalStats: GlobalStatistics = {
        totalUsers: 0,
        totalBorrowers: 0,
        totalLenders: 0,
        totalActiveLoans: 0,
        totalLoanVolume: 0,
        totalRevenue: 0,
        totalBlacklisted: 0,
        totalActiveSubscriptions: 0,
        totalComplaints: allComplaints?.length || 0,
        totalRepayments: 0,
        repaymentRate: 0,
        defaultRate: 0,
        countryBreakdown: [],
      }

      // Calculate totals
      allStats.forEach((stat) => {
        globalStats.totalBorrowers += stat.total_borrowers
        globalStats.totalLenders += stat.total_lenders
        globalStats.totalActiveLoans += stat.active_loans
        globalStats.totalLoanVolume += stat.total_loan_volume
        globalStats.totalRevenue += stat.revenue_today
        globalStats.totalBlacklisted += stat.blacklisted_borrowers
        globalStats.totalActiveSubscriptions += stat.active_subscriptions

        globalStats.countryBreakdown.push({
          country: stat.country,
          users: stat.total_borrowers + stat.total_lenders,
          borrowers: stat.total_borrowers,
          lenders: stat.total_lenders,
          loans: stat.active_loans,
          revenue: stat.revenue_today,
          complaints: 0, // Will be updated separately
          blacklisted: stat.blacklisted_borrowers,
        })
      })

      // Calculate payment statistics
      if (allPayments) {
        const completedPayments = allPayments.filter(p => p.status === 'completed')
        globalStats.totalRepayments = completedPayments.reduce((sum, p) => sum + p.amount, 0)
        globalStats.repaymentRate = allPayments.length > 0 
          ? (completedPayments.length / allPayments.length) * 100 
          : 0
      }

      globalStats.totalUsers = globalStats.totalBorrowers + globalStats.totalLenders
      setGlobalStats(globalStats)
    }
  }

  async function fetchComplaints() {
    const { data } = await supabase
      .from("complaints")
      .select(`
        *,
        complainant:profiles!complaints_complainant_id_fkey(full_name, email),
        respondent:profiles!complaints_respondent_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    setComplaints(data || [])
  }

  async function fetchRecentActivity() {
    // Fetch recent loans
    const { data: recentLoans } = await supabase
      .from("loans")
      .select(`
        *,
        borrower:profiles!loans_borrower_id_fkey(full_name),
        lender:profiles!loans_lender_id_fkey(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    // Fetch recent payments
    const { data: recentPayments } = await supabase
      .from("payments")
      .select(`
        *,
        loan:loans(
          amount,
          borrower:profiles!loans_borrower_id_fkey(full_name),
          lender:profiles!loans_lender_id_fkey(full_name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    const activity = [
      ...(recentLoans || []).map(loan => ({
        type: 'loan',
        timestamp: loan.created_at,
        description: `New loan: ${loan.borrower.full_name} borrowed from ${loan.lender.full_name}`,
        amount: loan.amount,
        status: loan.status
      })),
      ...(recentPayments || []).map(payment => ({
        type: 'payment',
        timestamp: payment.created_at,
        description: `Payment: ${payment.loan?.borrower.full_name} to ${payment.loan?.lender.full_name}`,
        amount: payment.amount,
        status: payment.status
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setRecentActivity(activity.slice(0, 10))
  }

  async function fetchAdditionalData() {
    // Implement time range filtering
    // This would fetch data based on the selected time range
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Complete platform overview and management</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      {globalStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {globalStats.totalBorrowers} borrowers • {globalStats.totalLenders} lenders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.totalActiveLoans}</div>
              <p className="text-xs text-muted-foreground">
                ${globalStats.totalLoanVolume.toLocaleString()} total volume
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${globalStats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {globalStats.totalActiveSubscriptions} active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Metrics</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.totalBlacklisted}</div>
              <p className="text-xs text-muted-foreground">
                blacklisted • {globalStats.totalComplaints} complaints
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Metrics Row */}
      {globalStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repayment Rate</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.repaymentRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                ${globalStats.totalRepayments.toLocaleString()} repaid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countries.filter(c => c.active).length}</div>
              <p className="text-xs text-muted-foreground">
                of {countries.length} total countries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.defaultRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                across all active loans
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Country Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Country Performance</CardTitle>
              <CardDescription>Comprehensive metrics by country</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Borrowers</TableHead>
                    <TableHead className="text-right">Lenders</TableHead>
                    <TableHead className="text-right">Active Loans</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Complaints</TableHead>
                    <TableHead className="text-right">Blacklisted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalStats?.countryBreakdown.map((stat) => {
                    const country = countries.find((c) => c.code === stat.country)
                    return (
                      <TableRow key={stat.country}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <span>{country?.flag}</span>
                            <span>{country?.name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{stat.users}</TableCell>
                        <TableCell className="text-right">{stat.borrowers}</TableCell>
                        <TableCell className="text-right">{stat.lenders}</TableCell>
                        <TableCell className="text-right">{stat.loans}</TableCell>
                        <TableCell className="text-right">
                          {country && formatCurrencyForCountry(stat.revenue, country.code)}
                        </TableCell>
                        <TableCell className="text-right">{stat.complaints}</TableCell>
                        <TableCell className="text-right">{stat.blacklisted}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Activity</CardTitle>
              <CardDescription>Latest transactions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {activity.type === 'loan' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${activity.amount.toLocaleString()}</p>
                      <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Country Management</CardTitle>
              <CardDescription>Configure country-specific settings and restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Restrictions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country) => (
                    <TableRow key={country.code}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </TableCell>
                      <TableCell>{country.currency_code}</TableCell>
                      <TableCell>{country.timezone}</TableCell>
                      <TableCell>
                        <Badge variant={country.active ? "default" : "secondary"}>
                          {country.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {country.restrictions_enabled ? (
                          <Badge variant="outline">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/admin/country?country=${country.code}`}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  User management interface with search, filters, and bulk actions
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Management</CardTitle>
              <CardDescription>Monitor all loans across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Comprehensive loan tracking with filters by status, country, and date range
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Management</CardTitle>
              <CardDescription>Review and resolve user complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>{new Date(complaint.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{complaint.complainant?.full_name}</TableCell>
                      <TableCell>{complaint.respondent?.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{complaint.complaint_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={complaint.status === 'resolved' ? 'default' : 'secondary'}>
                          {complaint.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure global platform settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Platform-wide configuration including subscription tiers, fee structures, and system settings
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}