export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Test database connection
    const { data, error } = await supabase.from("profiles").select("count").limit(1)

    if (error) {
      return NextResponse.json({ status: "unhealthy", error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    })
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "Internal server error" },
      { status: 500 }
    )
  }
}
