import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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

    const { mode, countryId } = await request.json()

    // Switch admin view
    const { data: success, error } = await supabase.rpc("switch_admin_view", {
      new_mode: mode,
      country_id: countryId || null,
    })

    if (error || !success) {
      console.error("Error switching admin view:", error)
      return NextResponse.json({ error: "Failed to switch view" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in switch admin view API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
