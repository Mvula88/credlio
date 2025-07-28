import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Fix dynamic server usage
export const dynamic = "force-dynamic"

export async function GET() {
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

    // Get platform statistics using admin client
    const [
      { count: totalUsers },
      { count: totalLoans },
      { count: activeLoans },
      { count: completedPayments },
      { count: blacklistedUsers },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("loan_requests").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("loan_requests").select("*", { count: "exact", head: true }).eq("status", "funded"),
      supabaseAdmin.from("loan_payments").select("*", { count: "exact", head: true }).eq("payment_status", "completed"),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("is_blacklisted", true),
    ])

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalLoans: totalLoans || 0,
        activeLoans: activeLoans || 0,
        completedPayments: completedPayments || 0,
        blacklistedUsers: blacklistedUsers || 0,
      },
    })
  } catch (error) {
    console.error("Stats API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
