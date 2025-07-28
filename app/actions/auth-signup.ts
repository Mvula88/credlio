"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"

interface SignupData {
  email: string
  password: string
  fullName: string
  phoneNumber: string
  role: "borrower" | "lender"
  countryId?: string
  detectedCountryCode?: string
  signupIpAddress?: string
}

export async function signupUser(data: SignupData) {
  const supabase = createServerSupabaseClient()

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "Failed to create user" }
    }

    // Create profile with country information
    const { error: profileError } = await supabase.from("profiles").insert({
      auth_user_id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      country_id: data.countryId,
      detected_country_code: data.detectedCountryCode,
      signup_ip_address: data.signupIpAddress,
      created_at: new Date().toISOString(),
    })

    if (profileError) {
      return { error: "Failed to create profile: " + profileError.message }
    }

    // Assign role
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", authData.user.id).single()

    if (profile) {
      const { data: role } = await supabase.from("user_roles").select("id").eq("role_name", data.role).single()

      if (role) {
        await supabase.from("user_profile_roles").insert({
          profile_id: profile.id,
          role_id: role.id,
        })
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Signup error:", error)
    return { error: "An unexpected error occurred" }
  }
}
