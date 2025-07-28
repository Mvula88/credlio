import { createServerSupabaseClient } from "./server-client"
import { supabaseAdmin } from "./setup"
import { redirect } from "next/navigation"

// Get the current user's profile
export async function getCurrentUserProfile() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("auth_user_id", user.id).single()

  return profile
}

// Get the current user's roles
export async function getCurrentUserRoles() {
  const supabase = createServerSupabaseClient()

  const profile = await getCurrentUserProfile()
  if (!profile) return []

  const { data: userRoles } = await supabase
    .from("user_profile_roles")
    .select("user_roles(role_name)")
    .eq("profile_id", profile.id)

  return userRoles?.map((ur) => ur.user_roles.role_name) || []
}

// Check if the current user has a specific role
export async function userHasRole(roleName: string) {
  const roles = await getCurrentUserRoles()
  return roles.includes(roleName)
}

// Require authentication or redirect
export async function requireAuth() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  return session
}

// Require a specific role or redirect
export async function requireRole(roleName: string) {
  await requireAuth()
  const hasRole = await userHasRole(roleName)

  if (!hasRole) {
    redirect("/unauthorized")
  }

  return true
}

// Create a new user with Supabase Auth
export async function createUser(email: string, password: string) {
  return await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
}

// Delete a user with Supabase Auth
export async function deleteUser(userId: string) {
  return await supabaseAdmin.auth.admin.deleteUser(userId)
}
