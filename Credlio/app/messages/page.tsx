import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export default async function Messages() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h1>Messages</h1>
      <p>User: {user?.email ?? "No user"}</p>
    </div>
  )
}
