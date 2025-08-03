import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS and get email
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("username", username.toLowerCase())
      .single()

    if (error || !profile) {
      // Don't reveal if username exists - always return success
      return NextResponse.json({
        success: true,
        message: "If an account exists with this username, we've sent a password reset link",
        email: "your registered email"
      })
    }

    // Use Supabase Auth to send password reset email
    // Supabase will generate the token and send the email
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      profile.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/auth/reset-password`
      }
    )

    if (resetError) {
      console.error("Password reset error:", resetError)
      return NextResponse.json(
        { error: "Failed to send reset email" },
        { status: 500 }
      )
    }

    // Mask email for response
    const [localPart, domain] = profile.email.split("@")
    const maskedEmail = localPart.substring(0, 2) + "***@" + domain

    console.log(`Password reset requested for ${username} (${maskedEmail})`)

    return NextResponse.json({
      success: true,
      message: "If an account exists with this username, we've sent a password reset link",
      email: maskedEmail
    })
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
}