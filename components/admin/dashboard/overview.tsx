"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  DollarSign,
  Globe,
  Shield,
  AlertTriangle,
  TrendingUp,
  Activity,
  UserCheck,
  Ban,
  Clock,
  CheckCircle,
  Eye,
  Settings,
  FileText,
  Download,
  ChevronRight,
  Building2,
  CreditCard,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface AdminOverviewProps {
  profile: any
  metrics: {
    totalUsers: number
    activeUsers: number
    totalLenders: number
    totalBorrowers: number
    totalLoans: number
    activeLoans: number
    totalVolume: number
    defaultRate: number
    platformRevenue: number
    monthlyGrowth: number
    verificationPending: number
    activeCountries: number
  }
  recentUsers: any[]
  recentLoans: any[]
  countryPerformance: any[]
  verificationQueue: any[]
  recentActivity: any[]
  riskAlerts: any[]
  isSuperAdmin: boolean
}

export function AdminOverview({
  profile,
  metrics,
  recentUsers,
  recentLoans,
  countryPerformance,
  verificationQueue,
  recentActivity,
  riskAlerts,
  isSuperAdmin
}: AdminOverviewProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>("all")

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_created":
        return <Users className="h-4 w-4" />
      case "loan_created":
        return <CreditCard className="h-4 w-4" />
      case "payment_completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "user_banned":
        return <Ban className="h-4 w-4 text-red-600" />
      case "verification_completed":
        return <UserCheck className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Complete system overview and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Badge className="bg-purple-100 text-purple-800">
              <Shield className="mr-1 h-3 w-3" />
              Super Admin
            </Badge>
          )}
          <Link href="/admin/dashboard/reports/export">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </Link>
          <Link href="/admin/dashboard/settings">
            <Button className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Risk Alerts */}
      {riskAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-red-800">
                  {riskAlerts.length} active risk alerts require attention
                </span>
                <p className="text-sm text-red-700 mt-1">
                  {riskAlerts.filter(a => a.severity === "critical").length} critical, 
                  {" "}{riskAlerts.filter(a => a.severity === "high").length} high priority
                </p>
              </div>
              <Link href="/admin/dashboard/compliance/risk">
                <Button size="sm" variant="destructive">
                  View Alerts
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +{metrics.monthlyGrowth}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
            <div className="mt-2 text-xs">
              <span className="text-blue-600">{metrics.totalLenders} lenders</span>
              {" • "}
              <span className="text-purple-600">{metrics.totalBorrowers} borrowers</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalVolume)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeLoans} active loans
            </p>
            <Progress value={75} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCountries}/16</div>
            <p className="text-xs text-muted-foreground">
              Countries with active users
            </p>
            <div className="mt-2 flex gap-1">
              {countryPerformance.slice(0, 8).map((country) => (
                <span key={country.code} className="text-lg" title={country.name}>
                  {country.flag_emoji}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              <span className="text-sm text-gray-600">
                {(100 - metrics.defaultRate).toFixed(1)}% success
              </span>
            </div>
            <div className="mt-2 text-xs">
              <span className="text-red-600">{metrics.defaultRate.toFixed(1)}% default rate</span>
              {" • "}
              <span className="text-amber-600">{metrics.verificationPending} pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">
            Users
            {metrics.verificationPending > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 px-1 text-xs">
                {metrics.verificationPending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="risks">
            Risks
            {riskAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 px-1 text-xs">
                {riskAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest platform registrations</CardDescription>
                  </div>
                  <Link href="/admin/dashboard/users/all">
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-medium">
                          {user.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || "Unknown"}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{user.email}</span>
                            {user.country?.flag_emoji && (
                              <span>{user.country.flag_emoji}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === "lender" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                        {!user.verified && (
                          <Badge variant="outline" className="text-amber-600">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Loans */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Loans</CardTitle>
                    <CardDescription>Latest loan activity</CardDescription>
                  </div>
                  <Link href="/admin/dashboard/financial/loans">
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentLoans.slice(0, 5).map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatCurrency(loan.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {loan.borrower?.full_name} → {loan.lender?.full_name}
                        </p>
                      </div>
                      <Badge
                        variant={
                          loan.status === "active"
                            ? "default"
                            : loan.status === "completed"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {loan.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Statistics</CardTitle>
              <CardDescription>Real-time system metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Active Users (24h)</p>
                  <p className="text-2xl font-bold">{metrics.activeUsers}</p>
                  <Progress value={(metrics.activeUsers / metrics.totalUsers) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Verification Queue</p>
                  <p className="text-2xl font-bold text-amber-600">{metrics.verificationPending}</p>
                  <Link href="/admin/dashboard/users/verification">
                    <Button size="sm" variant="outline" className="mt-2">
                      Process Queue
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Monthly Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.platformRevenue)}</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Total Loans</p>
                  <p className="text-2xl font-bold">{metrics.totalLoans}</p>
                  <p className="text-xs text-gray-600">{metrics.activeLoans} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage platform users and verifications</CardDescription>
            </CardHeader>
            <CardContent>
              {verificationQueue.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verificationQueue.slice(0, 10).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || "Unknown"}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.country?.name || "Unknown"}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No pending verifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Country Performance</CardTitle>
              <CardDescription>Activity and metrics by country</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Loans</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryPerformance.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{country.flag_emoji}</span>
                          <span className="font-medium">{country.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{country.userCount}</TableCell>
                      <TableCell className="text-right">{country.loanCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(country.loanCount * 2500)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            country.risk_level === "low"
                              ? "secondary"
                              : country.risk_level === "medium"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {country.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {country.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(metrics.totalVolume)}</p>
                <p className="text-sm text-gray-500">All-time platform volume</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Platform Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(metrics.platformRevenue)}</p>
                <p className="text-sm text-gray-500">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Default Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.defaultRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Platform average</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>Platform revenue sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                    <span>Subscription Fees</span>
                  </div>
                  <span className="font-medium">{formatCurrency(metrics.platformRevenue * 0.6)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                    <span>Transaction Fees</span>
                  </div>
                  <span className="font-medium">{formatCurrency(metrics.platformRevenue * 0.3)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-600" />
                    <span>Premium Features</span>
                  </div>
                  <span className="font-medium">{formatCurrency(metrics.platformRevenue * 0.1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Activity Log</CardTitle>
              <CardDescription>Recent platform activity and audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 20).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getActivityIcon(activity.action)}
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {activity.user?.full_name || "System"} • {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Alerts</CardTitle>
              <CardDescription>Active risk and compliance alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {riskAlerts.length > 0 ? (
                <div className="space-y-3">
                  {riskAlerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="font-medium">{alert.title}</span>
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {formatDate(alert.created_at)}
                        </p>
                        <Button size="sm" variant="outline">
                          Investigate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No active risk alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}