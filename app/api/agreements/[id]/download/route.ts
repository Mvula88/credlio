import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { generateLoanAgreementPDF } from "@/lib/loan-agreement/generator"

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

    // Get the loan agreement with all necessary details
    const { data: agreement, error: agreementError } = await supabase
      .from("loan_agreements")
      .select(`
        *,
        lender:profiles!lender_id (
          id,
          full_name,
          email,
          phone_number,
          business_name,
          business_registration_number,
          address
        ),
        borrower:profiles!borrower_id (
          id,
          full_name,
          email,
          phone_number,
          address
        ),
        loan_request:loan_requests!loan_request_id (
          id,
          amount_requested,
          purpose,
          created_at,
          country:countries (
            id,
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

    // Check permissions - borrower and lender can download their own agreements, admins can download all
    const canDownload = 
      agreement.borrower_id === profile.id ||
      agreement.lender_id === profile.id ||
      ['admin', 'super_admin', 'country_admin'].includes(profile.role)

    if (!canDownload) {
      return NextResponse.json({ error: "Unauthorized to download this agreement" }, { status: 403 })
    }

    // Transform data for PDF generation
    const loanData = {
      id: agreement.loan_request.id,
      amount_requested: agreement.loan_request.amount_requested,
      purpose: agreement.loan_request.purpose,
      created_at: agreement.loan_request.created_at,
      borrower: agreement.borrower,
      lender: agreement.lender,
      country: agreement.loan_request.country
    }

    const loanTerms = {
      loanAmount: agreement.loan_amount,
      interestRate: agreement.interest_rate,
      loanTerm: agreement.loan_term,
      repaymentFrequency: agreement.repayment_frequency,
      collateralDescription: agreement.collateral_description || "",
      additionalTerms: agreement.additional_terms || "",
      latePaymentPenalty: agreement.late_payment_penalty,
      defaultGracePeriod: agreement.default_grace_period
    }

    // Generate the PDF
    const pdfBuffer = await generateLoanAgreementPDF({
      loan: loanData,
      loanTerms
    })

    // Log the download action
    await supabase
      .from("agreement_audit_log")
      .insert({
        agreement_id: id,
        action: 'viewed',
        description: 'Agreement downloaded',
        user_id: profile.id,
        user_role: profile.role,
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1",
        user_agent: request.headers.get("user-agent")
      })

    // Return the PDF as a downloadable response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="loan-agreement-${agreement.agreement_number}.pdf"`
      }
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}