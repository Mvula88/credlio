import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin")

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get current admin view settings
    const { data: viewSettings, error } = await supabase.rpc("get_current_admin_view")

    if (error) {
      console.error("Error getting admin view settings:", error)
      return NextResponse.json({ error: "Failed to get view settings" }, { status: 500 })
    }

    return NextResponse.json(viewSettings?.[0] || null)
  } catch (error) {
    console.error("Error in admin view settings API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
