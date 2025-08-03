import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { getSecurityAlertEmail, getLoginAlertEmail } from "@/lib/email/email-templates"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, alertType, details } = await request.json()

    if (!userId || !alertType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get user details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, username")
      .eq("auth_user_id", userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    let emailHtml: string
    let subject: string

    switch (alertType) {
      case 'login':
        subject = "🔐 New Login Alert - Credlio"
        emailHtml = getLoginAlertEmail(profile.username, details)
        break
      
      case 'password_changed':
        subject = "🔔 Password Changed - Credlio"
        emailHtml = getSecurityAlertEmail(profile.username, 'password')
        break
      
      case 'email_changed':
        subject = "🔔 Email Address Changed - Credlio"
        emailHtml = getSecurityAlertEmail(profile.username, 'email', details.newEmail)
        break
      
      default:
        return NextResponse.json(
          { error: "Invalid alert type" },
          { status: 400 }
        )
    }

    // Send security alert email
    await sendEmail({
      to: profile.email,
      subject: subject,
      html: emailHtml,
      text: `Security alert for your Credlio account. Please check your email for details.`
    })

    // Log security event
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: userId,
        action: `security_alert_${alertType}`,
        details: details,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: "Security alert sent successfully"
    })
  } catch (error: any) {
    console.error("Security alert error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send security alert" },
      { status: 500 }
    )
  }
}