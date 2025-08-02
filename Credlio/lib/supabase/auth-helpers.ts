import { createServerSupabaseClient } from "./server-client"
import { supabaseAdmin } from "./setup"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

// Get the current user's profile
export async function getCurrentUserProfile() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  return profile
}

// Get the current user's role
export async function getCurrentUserRole() {
  const profile = await getCurrentUserProfile()
  return profile?.role || null
}

// Check if the current user has a specific role
export async function userHasRole(roleName: string) {
  const role = await getCurrentUserRole()
  return role === roleName
}

// Require authentication or redirect
export async function requireAuth() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/signin")
  }

  // Check email verification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !user.email_confirmed_at) {
    redirect("/settings?verify=true")
  }

  return session
}

// Require a specific role or redirect
export async function requireRole(roleName: string) {
  await requireAuth()
  const hasRole = await userHasRole(roleName)

  if (!hasRole) {
    redirect("/403")
  }

  return true
}

// Get user by email
export async function getUserByEmail(email: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single()

  return profile
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

// Sign out the current user
export async function signOut() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect("/auth/signin")
}

// Get redirect URL based on user role
export function getRedirectURLByRole(role: string | null) {
  switch (role) {
    case "borrower":
      return "/borrower/dashboard"
    case "lender":
      return "/lender/dashboard"
    case "admin":
      return "/admin/dashboard"
    default:
      return "/dashboard"
  }
}

// Check if user email is verified
export async function isEmailVerified() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.email_confirmed_at !== null
}
