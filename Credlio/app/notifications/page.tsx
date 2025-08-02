import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Mark as dynamic route
export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const supabase = createServerSupabaseClient()
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching notifications:", error)
    return <div>Error fetching notifications</div>
  }

  return (
    <div>
      <h1>Notifications</h1>
      {notifications && notifications.length > 0 ? (
        <ul>
          {notifications.map((notification) => (
            <li key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <small>Created at: {new Date(notification.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No notifications yet.</p>
      )}
    </div>
  )
}
