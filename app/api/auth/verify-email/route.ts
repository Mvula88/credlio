import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?error=missing_token`
      )
    }

    // Verify token exists and is valid
    const { data: confirmToken, error: tokenError } = await supabaseAdmin
      .from("email_confirmation_tokens")
      .select("*")
      .eq("token", token)
      .eq("confirmed", false)
      .gte("expires_at", new Date().toISOString())
      .single()

    if (tokenError || !confirmToken) {
      console.error("Invalid or expired token:", tokenError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?error=invalid_token`
      )
    }

    // Mark token as confirmed
    await supabaseAdmin
      .from("email_confirmation_tokens")
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString()
      })
      .eq("id", confirmToken.id)

    // Update user profile to mark email as verified
    await supabaseAdmin
      .from("profiles")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq("auth_user_id", confirmToken.user_id)

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?confirmed=true`
    )
  } catch (error: any) {
    console.error("Email verification error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin?error=verification_failed`
    )
  }
}