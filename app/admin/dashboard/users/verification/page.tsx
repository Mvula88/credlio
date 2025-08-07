import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield,
  FileText,
  AlertCircle,
  User
} from "lucide-react"

async function getVerificationRequests() {
  const supabase = createServerSupabaseClient()
  
  // Get all users pending verification
  const { data: pendingUsers } = await supabase
    .from("profiles")
    .select(`
      *,
      countries(name, code)
    `)
    .eq("is_verified", false)
    .order("created_at", { ascending: false })

  // Get recently verified users
  const { data: recentlyVerified } = await supabase
    .from("profiles")
    .select(`
      *,
      countries(name, code)
    `)
    .eq("is_verified", true)
    .order("updated_at", { ascending: false })
    .limit(10)

  // Count statistics
  const { count: totalPending } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", false)

  const { count: totalVerified } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", true)

  return {
    pendingUsers: pendingUsers || [],
    recentlyVerified: recentlyVerified || [],
    totalPending: totalPending || 0,
    totalVerified: totalVerified || 0
  }
}

export default async function UserVerificationPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile?.role?.includes("admin")) {
    redirect("/")
  }

  const data = await getVerificationRequests()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Verification</h1>
        <p className="text-muted-foreground">
          Review and approve user verification requests
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVerified}</div>
            <p className="text-xs text-muted-foreground">
              Total verified users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalVerified + data.totalPending > 0
                ? Math.round((data.totalVerified / (data.totalVerified + data.totalPending)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalVerified + data.totalPending}
            </div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>
      </div>

      {data.totalPending > 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>High Verification Queue</AlertTitle>
          <AlertDescription>
            There are {data.totalPending} users waiting for verification. 
            Consider reviewing these requests to maintain user satisfaction.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
            <CardDescription>
              Users waiting for identity verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.pendingUsers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No pending verifications
              </p>
            ) : (
              <div className="space-y-4">
                {data.pendingUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.countries?.name} • {user.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button size="sm" variant="default">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.pendingUsers.length > 5 && (
              <Button variant="outline" className="w-full mt-4">
                View All ({data.pendingUsers.length})
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Verified</CardTitle>
            <CardDescription>
              Users recently approved for platform access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentlyVerified.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No recent verifications
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentlyVerified.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.countries?.name} • {user.role}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Guidelines</CardTitle>
          <CardDescription>
            Follow these steps when verifying user identities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Verify Government ID</p>
                <p className="text-sm text-muted-foreground">
                  Check that the provided ID is valid and matches user details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Confirm Address</p>
                <p className="text-sm text-muted-foreground">
                  Verify proof of address documents are recent and valid
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Check for Duplicates</p>
                <p className="text-sm text-muted-foreground">
                  Ensure no duplicate accounts exist for the same person
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Flag Suspicious Activity</p>
                <p className="text-sm text-muted-foreground">
                  Report any suspicious documents or behavior for further review
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}