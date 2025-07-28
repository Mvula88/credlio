import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function createAuditLog(userId: string, action: string, details: any) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from("audit_logs").insert([{ user_id: userId, action: action, details: details }])

  if (error) {
    console.error("Error creating audit log:", error)
  }
}
