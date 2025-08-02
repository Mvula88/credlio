import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function getNotifications() {
  const supabase = createServerSupabaseClient()

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  return notifications
}

export async function markNotificationAsRead(id: string) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id)

  if (error) {
    console.error("Error marking notification as read:", error)
    return false
  }

  return true
}
