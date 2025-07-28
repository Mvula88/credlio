"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { getCurrentUserProfile, userHasRole } from "@/lib/supabase/auth-helpers"
import { revalidatePath } from "next/cache"

export async function assignCountryAdmin(profileId: string, countryId: string, permissions: any) {
  const supabase = createServerSupabaseClient()

  // Check if current user is super admin
  const isSuperAdmin = await userHasRole("super_admin")
  if (!isSuperAdmin) {
    throw new Error("Only super admins can assign country admins")
  }

  try {
    // Insert country admin assignment
    const { error: assignError } = await supabase.from("country_admins").insert({
      profile_id: profileId,
      country_id: countryId,
      permissions,
    })

    if (assignError) throw assignError

    // Assign country_admin role to the user
    const { data: roleData } = await supabase.from("user_roles").select("id").eq("role_name", "country_admin").single()

    if (roleData) {
      const { error: roleError } = await supabase.from("user_profile_roles").insert({
        profile_id: profileId,
        role_id: roleData.id,
      })

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError
      }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to assign country admin: ${error.message}`)
  }
}

export async function removeCountryAdmin(countryAdminId: string) {
  const supabase = createServerSupabaseClient()

  // Check if current user is super admin
  const isSuperAdmin = await userHasRole("super_admin")
  if (!isSuperAdmin) {
    throw new Error("Only super admins can remove country admins")
  }

  try {
    const { error } = await supabase.from("country_admins").delete().eq("id", countryAdminId)

    if (error) throw error

    revalidatePath("/admin")
    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to remove country admin: ${error.message}`)
  }
}

export async function updateCountryAdminPermissions(countryAdminId: string, permissions: any) {
  const supabase = createServerSupabaseClient()

  // Check if current user is super admin
  const isSuperAdmin = await userHasRole("super_admin")
  if (!isSuperAdmin) {
    throw new Error("Only super admins can update country admin permissions")
  }

  try {
    const { error } = await supabase.from("country_admins").update({ permissions }).eq("id", countryAdminId)

    if (error) throw error

    revalidatePath("/admin")
    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to update permissions: ${error.message}`)
  }
}

export async function toggleCountryAdminStatus(countryAdminId: string, isActive: boolean) {
  const supabase = createServerSupabaseClient()

  // Check if current user is super admin
  const isSuperAdmin = await userHasRole("super_admin")
  if (!isSuperAdmin) {
    throw new Error("Only super admins can toggle country admin status")
  }

  try {
    const { error } = await supabase.from("country_admins").update({ is_active: isActive }).eq("id", countryAdminId)

    if (error) throw error

    revalidatePath("/admin")
    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to update status: ${error.message}`)
  }
}

export async function getCountryAdminCountries() {
  const supabase = createServerSupabaseClient()
  const profile = await getCurrentUserProfile()

  if (!profile) {
    throw new Error("User not authenticated")
  }

  try {
    const { data, error } = await supabase
      .from("country_admins")
      .select(`
        countries (
          id,
          name,
          code
        )
      `)
      .eq("profile_id", profile.id)
      .eq("is_active", true)

    if (error) throw error

    return data?.map((item) => item.countries) || []
  } catch (error: any) {
    throw new Error(`Failed to get admin countries: ${error.message}`)
  }
}
