import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { getSubscriptionReceiptEmail } from "@/lib/email/email-templates"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, receipt } = await request.json()

    if (!userId || !receipt) {
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

    // Send receipt email
    await sendEmail({
      to: profile.email,
      subject: `Payment Receipt - Credlio #${receipt.invoiceId}`,
      html: getSubscriptionReceiptEmail(profile.username, receipt),
      text: `Payment receipt for ${receipt.planName}. Amount: ${receipt.amount}. Invoice ID: ${receipt.invoiceId}`
    })

    return NextResponse.json({
      success: true,
      message: "Receipt sent successfully"
    })
  } catch (error: any) {
    console.error("Subscription receipt error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send receipt" },
      { status: 500 }
    )
  }
}

// Webhook endpoint for Stripe
export async function PUT(request: Request) {
  try {
    const sig = request.headers.get('stripe-signature')
    
    if (!sig) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const body = await request.text()
    
    // This would be called by Stripe webhook
    // Parse the Stripe event and send receipt
    const event = JSON.parse(body)
    
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      
      // Get user by customer ID
      const { data: subscription } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, profiles(email, username)")
        .eq("stripe_customer_id", invoice.customer)
        .single()
      
      if (subscription) {
        const receipt = {
          planName: invoice.lines.data[0].description,
          amount: `$${(invoice.amount_paid / 100).toFixed(2)}`,
          date: new Date(invoice.created * 1000).toLocaleDateString(),
          invoiceId: invoice.number || invoice.id,
          nextBillingDate: new Date(invoice.period_end * 1000).toLocaleDateString()
        }
        
        // Send receipt via our endpoint
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/subscription-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: subscription.user_id,
            receipt
          })
        })
      }
    }
    
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}