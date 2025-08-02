import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { detectCountryFromIP } from "@/lib/services/geolocation"
import type { Database } from "@/lib/types/database"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's IP address from headers
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || request.ip || "127.0.0.1"

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Detect country from IP
    const result = await detectCountryFromIP(ip, profile.id)

    return NextResponse.json({
      country: result.country,
      isSupported: result.isSupported,
      detectedCountry: result.detectedCountry,
      city: result.city,
      region: result.region,
    })
  } catch (error) {
    console.error("Geolocation error:", error)
    return NextResponse.json({ error: "Failed to detect location" }, { status: 500 })
  }
}
