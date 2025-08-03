import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail, generateToken, getTokenExpiry, getEmailConfirmationEmail } from "@/lib/email/send-email"

// Use service role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Send confirmation request received:', body)
    
    const { userId, email, username } = body

    if (!userId || !email || !username) {
      console.error('Missing fields:', { userId: !!userId, email: !!email, username: !!username })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate confirmation token
    const token = generateToken()
    const expiresAt = getTokenExpiry(24) // 24 hours expiry

    // Store token in database
    const { error: tokenError } = await supabaseAdmin
      .from("email_confirmation_tokens")
      .insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString()
      })

    if (tokenError) {
      console.error("Failed to store confirmation token:", tokenError)
      // If table doesn't exist, still try to send email
      if (!tokenError.message?.includes('relation')) {
        return NextResponse.json(
          { error: "Failed to process email confirmation" },
          { status: 500 }
        )
      }
    }

    // Create confirmation link
    const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send')
      console.log('Would send confirmation to:', email)
      console.log('Confirmation link:', confirmLink)
      
      // Return success even if email not sent (for testing)
      return NextResponse.json({
        success: true,
        message: "Confirmation email skipped (no RESEND_API_KEY)",
        confirmLink: confirmLink // Include link for testing
      })
    }

    // Send confirmation email with username included
    await sendEmail({
      to: email,
      subject: "Confirm Your Credlio Account",
      html: getEmailConfirmationEmail(confirmLink, username),
      text: `Welcome to Credlio!\n\nYour username is: ${username}\n\nPlease confirm your email by visiting: ${confirmLink}\n\nThis link will expire in 24 hours.`
    })

    console.log(`Confirmation email sent to ${email} for user ${username}`)

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent successfully"
    })
  } catch (error: any) {
    console.error("Send confirmation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send confirmation email" },
      { status: 500 }
    )
  }
}