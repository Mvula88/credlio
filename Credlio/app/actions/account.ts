"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function deleteUserAccount() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  // Get profile ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single()

  if (profile) {
    // Delete profile (this will cascade delete user_profile_roles)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", profile.id)

    if (profileError) {
      return { success: false, error: profileError.message }
    }
  }

  // Delete user auth record
  const { error: userError } = await supabase.auth.admin.deleteUser(session.user.id)

  if (userError) {
    return { success: false, error: userError.message }
  }

  // Sign out
  await supabase.auth.signOut()

  revalidatePath("/")
  redirect("/auth")
}
