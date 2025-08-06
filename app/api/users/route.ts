import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Fix dynamic server usage
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const id = searchParams.get("id")
    const role = searchParams.get("role")
    const isBlacklisted = searchParams.get("blacklisted")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // If searching for a specific user by ID
    if (id) {
      const { data: user, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ user })
    }

    // For search (used by chat to find users)
    if (search) {
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, profile_picture_url, online_status, role")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .neq("auth_user_id", user.id) // Exclude current user
        .limit(10)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ users: users || [] })
    }

    // For admin listing - only if user is admin
    if (currentProfile.role !== "admin" && currentProfile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let query = supabaseAdmin
      .from("profiles")
      .select("*")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false })

    if (role) {
      query = query.eq("role", role)
    }

    if (isBlacklisted !== null) {
      query = query.eq("is_blacklisted", isBlacklisted === "true")
    }

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        limit,
        offset,
        total: users?.length || 0,
      },
    })
  } catch (error) {
    console.error("Users API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
