import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail, getUsernameRecoveryEmail } from "@/lib/email/send-email"

// Use service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS and get username
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("username, email")
      .eq("email", email.toLowerCase())
      .single()

    if (error || !profile) {
      // Don't reveal if email exists - always return success
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, we've sent the username"
      })
    }

    // Send username recovery email
    await sendEmail({
      to: email,
      subject: "Your Credlio Username",
      html: getUsernameRecoveryEmail(profile.username),
      text: `Your Credlio username is: ${profile.username}\n\nYou can sign in at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin`
    })

    console.log(`Username recovery email sent to ${email}`)

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, we've sent the username"
    })
  } catch (error: any) {
    console.error("Forgot username error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    )
  }
}