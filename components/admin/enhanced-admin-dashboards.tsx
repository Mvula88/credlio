"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  AlertTriangle, 
  Ban, 
  Ghost, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  Activity,
  RefreshCw,
  Globe,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { 
  getCountryRiskStatistics, 
  getGlobalAdminStatistics,
  getRecentRiskActivities,
  refreshAdminStatistics 
} from "@/app/actions/admin-statistics"
import { formatDistanceToNow } from "date-fns"

interface CountryAdminDashboardProps {
  countryCode: string
  countryName: string
}

export function CountryAdminDashboard({ countryCode, countryName }: CountryAdminDashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [countryCode])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, activitiesData] = await Promise.all([
        getCountryRiskStatistics(countryCode),
        getRecentRiskActivities(countryCode, 10)
      ])
      
      setStats(statsData)
      setActivities(activitiesData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshAdminStatistics()
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const riskScore = stats ? Math.max(0, 100 - ((stats.total_risky_borrowers + stats.total_blacklisted) / Math.max(stats.total_borrowers, 1)) * 100) : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Country Admin Dashboard</h1>
          <p className="text-muted-foreground">Managing {countryName}</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Risky Borrowers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-700">
              {stats?.total_risky_borrowers || 0}
            </p>
            <p className="text-sm text-red-600">Currently flagged as risky</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-600" />
              Blacklisted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-700">
              {stats?.total_blacklisted || 0}
            </p>
            <p className="text-sm text-orange-600">Permanently blacklisted</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-5 w-5 text-yellow-600" />
              Off-Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-700">
              {stats?.total_off_platform_defaulters || 0}
            </p>
            <p className="text-sm text-yellow-600">Reported defaulters</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ghost className="h-5 w-5 text-purple-600" />
              Ghost Defaulters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-700">
              {stats?.total_ghost_defaulters || 0}
            </p>
            <p className="text-sm text-purple-600">Ghost loan defaults</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Platform Health Score
          </CardTitle>
          <CardDescription>
            Overall risk assessment for {countryName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{riskScore.toFixed(0)}%</span>
            <Badge className={riskScore >= 80 ? 'bg-green-100 text-green-800' : riskScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
              {riskScore >= 80 ? 'Healthy' : riskScore >= 60 ? 'Moderate Risk' : 'High Risk'}
            </Badge>
          </div>
          <Progress value={riskScore} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loan Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Loans</span>
                  <span className="font-medium">{stats?.total_active_loans || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overdue Loans</span>
                  <span className="font-medium text-orange-600">{stats?.total_overdue_loans || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Defaulted Loans</span>
                  <span className="font-medium text-red-600">{stats?.total_defaulted_loans || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Loan Amount</span>
                    <span className="font-bold">${(stats?.total_loan_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium">Overdue Amount</span>
                    <span className="font-bold text-red-600">${(stats?.total_overdue_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Lenders</span>
                  <span className="font-medium">{stats?.total_lenders || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Borrowers</span>
                  <span className="font-medium">{stats?.total_borrowers || 0}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">This Month</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">New Borrowers</span>
                    <Badge variant="outline">{stats?.new_borrowers_this_month || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">New Lenders</span>
                    <Badge variant="outline">{stats?.new_lenders_this_month || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Risk Activities</CardTitle>
              <CardDescription>Latest risk-related events in {countryName}</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent activities</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0">
                      <div className={`p-2 rounded-full ${
                        activity.severity === 'high' ? 'bg-red-100' :
                        activity.severity === 'medium' ? 'bg-orange-100' :
                        'bg-yellow-100'
                      }`}>
                        {activity.activity_type === 'blacklist_added' ? <Ban className="h-4 w-4" /> :
                         activity.activity_type === 'marked_risky' ? <AlertTriangle className="h-4 w-4" /> :
                         activity.activity_type === 'off_platform_report' ? <UserX className="h-4 w-4" /> :
                         <Ghost className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.activity_description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>By: {activity.actor_name}</span>
                          <span>Target: {activity.target_name}</span>
                          <span>{formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <Badge variant={activity.severity === 'high' ? 'destructive' : activity.severity === 'medium' ? 'secondary' : 'outline'}>
                        {activity.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface SuperAdminDashboardProps {}

export function SuperAdminDashboard(props: SuperAdminDashboardProps) {
  const [globalStats, setGlobalStats] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, activitiesData] = await Promise.all([
        getGlobalAdminStatistics(),
        getRecentRiskActivities(undefined, 20)
      ])
      
      setGlobalStats(statsData)
      setActivities(activitiesData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshAdminStatistics()
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalRisky = globalStats.reduce((sum, country) => sum + country.total_risky_borrowers, 0)
  const totalBlacklisted = globalStats.reduce((sum, country) => sum + country.total_blacklisted, 0)
  const totalOffPlatform = globalStats.reduce((sum, country) => sum + country.total_off_platform_defaulters, 0)
  const totalGhostDefaulters = globalStats.reduce((sum, country) => sum + country.total_ghost_defaulters, 0)
  const totalActiveLoans = globalStats.reduce((sum, country) => sum + country.total_active_loans, 0)
  const totalUsers = globalStats.reduce((sum, country) => sum + country.total_users, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Global platform overview</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Global Risk Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Risky Borrowers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{totalRisky}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600">Blacklisted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-700">{totalBlacklisted}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-600">Off-Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-700">{totalOffPlatform}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-600">Ghost Defaults</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-700">{totalGhostDefaulters}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">Active Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{totalActiveLoans}</p>
          </CardContent>
        </Card>
      </div>

      {/* Country-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Country Performance</CardTitle>
          <CardDescription>Risk metrics and health scores by country</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Country</th>
                  <th className="text-center p-2">Users</th>
                  <th className="text-center p-2">Risky</th>
                  <th className="text-center p-2">Blacklisted</th>
                  <th className="text-center p-2">Off-Platform</th>
                  <th className="text-center p-2">Ghost Defaults</th>
                  <th className="text-center p-2">Active Loans</th>
                  <th className="text-center p-2">Health Score</th>
                </tr>
              </thead>
              <tbody>
                {globalStats.map((country) => (
                  <tr key={country.country_code} className="border-b">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{country.country_name}</span>
                      </div>
                    </td>
                    <td className="text-center p-2">{country.total_users}</td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-red-50">
                        {country.total_risky_borrowers}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-orange-50">
                        {country.total_blacklisted}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-yellow-50">
                        {country.total_off_platform_defaulters}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant="outline" className="bg-purple-50">
                        {country.total_ghost_defaulters}
                      </Badge>
                    </td>
                    <td className="text-center p-2">{country.total_active_loans}</td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={country.platform_health_score} className="w-16 h-2" />
                        <span className="text-sm font-medium">{country.platform_health_score}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Global Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Global Risk Activities</CardTitle>
          <CardDescription>Latest risk events across all countries</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activities</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.severity === 'high' ? 'bg-red-100' :
                    activity.severity === 'medium' ? 'bg-orange-100' :
                    'bg-yellow-100'
                  }`}>
                    {activity.activity_type === 'blacklist_added' ? <Ban className="h-4 w-4" /> :
                     activity.activity_type === 'marked_risky' ? <AlertTriangle className="h-4 w-4" /> :
                     activity.activity_type === 'off_platform_report' ? <UserX className="h-4 w-4" /> :
                     <Ghost className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.activity_description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>By: {activity.actor_name}</span>
                      <span>Target: {activity.target_name}</span>
                      <span>{formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge variant={activity.severity === 'high' ? 'destructive' : activity.severity === 'medium' ? 'secondary' : 'outline'}>
                    {activity.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}