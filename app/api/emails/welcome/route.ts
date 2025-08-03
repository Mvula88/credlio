import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { getWelcomeEmail } from "@/lib/email/email-templates"

export async function POST(request: Request) {
  try {
    const { email, username, role } = await request.json()

    if (!email || !username || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "Welcome to Credlio! 🎉",
      html: getWelcomeEmail(username, role),
      text: `Welcome to Credlio, ${username}! Your account has been verified and you're ready to start.`
    })

    return NextResponse.json({
      success: true,
      message: "Welcome email sent successfully"
    })
  } catch (error: any) {
    console.error("Welcome email error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send welcome email" },
      { status: 500 }
    )
  }
}