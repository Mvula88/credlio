import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import crypto from 'crypto'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", session.user.id)
      .single()

    if (!profile || profile.role !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can sign agreements" }, { status: 403 })
    }

    // Get the loan agreement
    const { data: agreement, error: agreementError } = await supabase
      .from("loan_agreements")
      .select("*")
      .eq("id", id)
      .eq("borrower_id", profile.id) // Ensure borrower owns this agreement
      .single()

    if (agreementError || !agreement) {
      return NextResponse.json({ error: "Agreement not found or unauthorized" }, { status: 404 })
    }

    // Check if already signed
    if (agreement.borrower_signed) {
      return NextResponse.json({ error: "Agreement has already been signed" }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { borrowerInfo, signature, timestamp } = body

    // Validate required fields
    if (!borrowerInfo?.fullName || !borrowerInfo?.idNumber || !borrowerInfo?.phoneNumber) {
      return NextResponse.json({ error: "Missing required borrower information" }, { status: 400 })
    }

    if (!signature) {
      return NextResponse.json({ error: "Digital signature is required" }, { status: 400 })
    }

    // Get client IP for audit trail
    const clientIP = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "127.0.0.1"

    // Generate signature hash for verification
    const signatureHash = crypto
      .createHash('sha256')
      .update(signature + borrowerInfo.fullName + borrowerInfo.idNumber + timestamp)
      .digest('hex')

    // Update the agreement with signature information
    const { data: updatedAgreement, error: updateError } = await supabase
      .from("loan_agreements")
      .update({
        borrower_signed: true,
        borrower_signature_date: new Date().toISOString(),
        borrower_signature_ip: clientIP,
        borrower_full_name: borrowerInfo.fullName,
        borrower_id_number: borrowerInfo.idNumber,
        borrower_phone_number: borrowerInfo.phoneNumber,
        signature_hash: signatureHash,
        signature_verified: true,
        agreement_status: 'signed',
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating agreement:", updateError)
      return NextResponse.json({ error: "Failed to record signature" }, { status: 500 })
    }

    // Update the related loan request status to 'active'
    const { error: loanUpdateError } = await supabase
      .from("loan_requests")
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq("id", agreement.loan_request_id)

    if (loanUpdateError) {
      console.error("Error updating loan status:", loanUpdateError)
      // Don't fail the request, but log the error
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from("agreement_audit_log")
      .insert({
        agreement_id: id,
        action: 'signed',
        user_id: profile.id,
        user_role: 'borrower',
        ip_address: clientIP,
        user_agent: request.headers.get("user-agent"),
        signature_hash: signatureHash,
        borrower_info: borrowerInfo,
        timestamp: new Date().toISOString()
      })

    if (auditError) {
      console.error("Error creating audit log:", auditError)
      // Don't fail the request
    }

    // Send notification to lender (you can implement this)
    // await sendLoanActivationNotification(agreement.lender_id, agreement.loan_request_id)

    return NextResponse.json({ 
      success: true, 
      message: "Agreement signed successfully",
      agreement: updatedAgreement
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to retrieve agreement details for signing
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = params

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", session.user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get the loan agreement with related data
    const { data: agreement, error: agreementError } = await supabase
      .from("loan_agreements")
      .select(`
        *,
        lender:profiles!lender_id (
          id,
          full_name,
          business_name,
          email
        ),
        borrower:profiles!borrower_id (
          id,
          full_name,
          email
        ),
        loan_request:loan_requests!loan_request_id (
          id,
          amount_requested,
          purpose,
          country:countries (
            name,
            currency_code,
            currency_symbol
          )
        )
      `)
      .eq("id", id)
      .single()

    if (agreementError || !agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 })
    }

    // Check permissions - borrower can view their own, lender can view their own, admins can view all
    const canView = 
      agreement.borrower_id === profile.id ||
      agreement.lender_id === profile.id ||
      ['admin', 'super_admin', 'country_admin'].includes(profile.role)

    if (!canView) {
      return NextResponse.json({ error: "Unauthorized to view this agreement" }, { status: 403 })
    }

    return NextResponse.json({ agreement })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}