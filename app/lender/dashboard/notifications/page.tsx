import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle, Info, AlertCircle, DollarSign } from "lucide-react"
import { format } from "date-fns"

async function getNotifications(profileId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  return notifications || []
}

async function markAsRead(notificationIds: string[]) {
  const supabase = createServerSupabaseClient()
  
  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", notificationIds)
}

export default async function NotificationsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "lender") {
    redirect("/")
  }

  const notifications = await getNotifications(profile.id)
  const unreadCount = notifications.filter(n => !n.read).length

  // Mark all as read when page is viewed
  if (unreadCount > 0) {
    await markAsRead(notifications.filter(n => !n.read).map(n => n.id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="h-4 w-4" />
      case "alert":
        return <AlertCircle className="h-4 w-4" />
      case "info":
        return <Info className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getVariant = (type: string) => {
    switch (type) {
      case "payment":
        return "default"
      case "alert":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your lending activities
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="default" className="text-lg px-3 py-1">
            {unreadCount} New
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            Your recent notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll receive notifications about loan requests, payments, and more
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    !notification.read ? "bg-accent/50" : ""
                  }`}
                >
                  <div className={`mt-1 p-2 rounded-full ${
                    notification.type === "payment" ? "bg-green-100 text-green-600" :
                    notification.type === "alert" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <Badge variant={getVariant(notification.type)}>
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}