"use client"

import { useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  LogOut,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Building,
  CreditCard,
  BarChart3,
  UserX
} from "lucide-react"
import { DeleteAccountButton } from "@/components/auth/delete-account-button"
import { SignOutButton } from "@/components/auth/sign-out-button"

interface LenderProfileProps {
  profile: any
  stats?: {
    totalLent: number
    activeLoans: number
    totalBorrowers: number
    averageLoanSize: number
    returnOnInvestment: number
    defaultRate: number
    successfulLoans: number
    blacklistCount: number
  }
  subscription?: {
    plan: string
    status: string
    nextBilling?: string
    usage?: {
      borrowersLimit: number
      borrowersUsed: number
      loansLimit: number
      loansUsed: number
    }
  }
}

export function LenderProfile({ profile, stats, subscription }: LenderProfileProps) {
  const [showUsername, setShowUsername] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseClient()
  const router = useRouter()

  const [editData, setEditData] = useState({
    phone: profile.phone || "",
    email: profile.email || "",
    business_name: profile.business_name || ""
  })

  const handleCopyUsername = async () => {
    if (profile.username) {
      await navigator.clipboard.writeText(profile.username)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: editData.phone,
          email: editData.email,
          business_name: editData.business_name,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id)

      if (!error) {
        setIsEditing(false)
        window.location.reload()
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const getVerificationBadge = () => {
    if (profile.id_verified) {
      return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
    }
    return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unverified</Badge>
  }

  const getSubscriptionBadge = () => {
    if (!subscription) return null
    const variant = subscription.status === 'active' ? 'success' : 'secondary'
    return <Badge variant={variant}>{subscription.plan} Plan</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                {profile.business_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {profile.business_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {getVerificationBadge()}
                  {getSubscriptionBadge()}
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {profile.country || "Not set"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/lender/subscription')}>
                <CreditCard className="h-4 w-4 mr-1" />
                Manage Subscription
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Username</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {showUsername ? profile.username : "••••••••"}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowUsername(!showUsername)}
                    >
                      {showUsername ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopyUsername}
                    >
                      {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email</span>
                  </div>
                  <span className="text-sm">{profile.email}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Phone</span>
                  </div>
                  <span className="text-sm">{profile.phone || "Not provided"}</span>
                </div>

                {profile.business_name && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Business</span>
                    </div>
                    <span className="text-sm">{profile.business_name}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Member Since</span>
                  </div>
                  <span className="text-sm">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Lending Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Lending Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Lent</p>
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xl font-bold">
                        {stats?.totalLent?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active Loans</p>
                    <p className="text-xl font-bold">{stats?.activeLoans || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Borrowers</p>
                    <div className="flex items-baseline gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xl font-bold">{stats?.totalBorrowers || 0}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Loan Size</p>
                    <p className="text-xl font-bold">
                      ${stats?.averageLoanSize?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Return on Investment</span>
                    <span className="text-sm font-medium">{stats?.returnOnInvestment || 0}%</span>
                  </div>
                  <Progress value={stats?.returnOnInvestment || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.successfulLoans || 0}
                </div>
                <p className="text-xs text-muted-foreground">Successful loans</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.defaultRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Of total loans</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  {stats?.blacklistCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">Borrowers blacklisted</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                Manage your subscription and view usage limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{subscription.plan} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className={subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                          {subscription.status}
                        </span>
                      </p>
                    </div>
                    {subscription.nextBilling && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Next billing</p>
                        <p className="font-medium">
                          {new Date(subscription.nextBilling).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {subscription.usage && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Borrowers</span>
                          <span className="text-sm">
                            {subscription.usage.borrowersUsed} / {subscription.usage.borrowersLimit}
                          </span>
                        </div>
                        <Progress 
                          value={(subscription.usage.borrowersUsed / subscription.usage.borrowersLimit) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Active Loans</span>
                          <span className="text-sm">
                            {subscription.usage.loansUsed} / {subscription.usage.loansLimit}
                          </span>
                        </div>
                        <Progress 
                          value={(subscription.usage.loansUsed / subscription.usage.loansLimit) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/lender/subscription')}
                  >
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active subscription</p>
                  <Button onClick={() => router.push('/lender/subscribe')}>
                    Subscribe Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Sign Out</p>
                      <p className="text-sm text-muted-foreground">
                        Sign out from your account on this device
                      </p>
                    </div>
                  </div>
                  <SignOutButton />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">Delete Account</p>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all data
                      </p>
                    </div>
                  </div>
                  <DeleteAccountButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="business_name">Business Name (Optional)</Label>
              <Input
                id="business_name"
                value={editData.business_name}
                onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                placeholder="Your business name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}