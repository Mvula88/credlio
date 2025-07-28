import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Fix dynamic server usage
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const isBlacklisted = searchParams.get("blacklisted")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

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
