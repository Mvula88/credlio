"use server"

import { supabaseAdmin } from "@/lib/supabase/admin-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { revalidatePath } from "next/cache"

// Admin function to blacklist a user (uses admin client for elevated permissions)
export async function blacklistUser(userId: string, reason: string) {
  try {
    // First check if current user is admin using user-context client
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Check if user is admin (this would use your RLS policies)
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return { success: false, error: "Not authorized" }
    }

    // Now use admin client for the actual blacklisting
    const { error } = await supabaseAdmin.from("profiles").update({ is_blacklisted: true }).eq("id", userId)

    if (error) {
      console.error("Error blacklisting user:", error)
      return { success: false, error: "Failed to blacklist user" }
    }

    // Create audit log using admin client
    await supabaseAdmin.from("audit_logs").insert({
      actor_profile_id: user.id,
      action: "blacklist_user",
      target_profile_id: userId,
      details: { reason },
    })

    revalidatePath("/admin/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error in blacklistUser:", error)
    return { success: false, error: "Internal server error" }
  }
}

// Admin function to get all users (uses admin client for elevated permissions)
export async function getAllUsers() {
  try {
    // First check if current user is admin
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated", data: [] }
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return { success: false, error: "Not authorized", data: [] }
    }

    // Use admin client to get all users
    const { data: users, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return { success: false, error: "Failed to fetch users", data: [] }
    }

    return { success: true, data: users }
  } catch (error) {
    console.error("Error in getAllUsers:", error)
    return { success: false, error: "Internal server error", data: [] }
  }
}
