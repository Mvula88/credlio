import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createCustomerPortalSession } from "@/lib/services/stripe"
import type { Database } from "@/lib/types/database"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const { returnUrl } = await request.json()

    if (!returnUrl) {
      return NextResponse.json({ error: "Missing return URL" }, { status: 400 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user is a lender
    if (profile.role !== "lender") {
      return NextResponse.json({ error: "Only lenders can manage subscriptions" }, { status: 403 })
    }

    // Create portal session
    const portalUrl = await createCustomerPortalSession(profile.id, returnUrl)

    return NextResponse.json({ url: portalUrl })
  } catch (error: any) {
    console.error("Portal error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    )
  }
}
