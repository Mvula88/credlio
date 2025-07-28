import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if user already had a trial
    const { data: existingTrial } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("status", "trial")
      .single()

    if (existingTrial) {
      return NextResponse.json({ error: "Free trial already used" }, { status: 400 })
    }

    // Get the Free Trial plan
    const { data: freePlan } = await supabase.from("subscription_plans").select("id").eq("name", "Free Trial").single()

    if (!freePlan) {
      return NextResponse.json({ error: "Free trial plan not found" }, { status: 404 })
    }

    // Create 1-day trial subscription
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 1) // 1 day from now

    const { error: subscriptionError } = await supabase.from("user_subscriptions").insert({
      profile_id: profile.id,
      plan_id: freePlan.id,
      status: "trial",
      expires_at: expiresAt.toISOString(),
    })

    if (subscriptionError) {
      console.error("Error creating trial subscription:", subscriptionError)
      return NextResponse.json({ error: "Failed to start trial" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Free trial started successfully",
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("Error starting free trial:", error)
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 })
  }
}
