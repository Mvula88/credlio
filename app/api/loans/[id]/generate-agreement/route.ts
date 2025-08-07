import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { generateLoanAgreementPDF } from "@/lib/loan-agreement/generator"

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

    if (!profile || profile.role !== "lender") {
      return NextResponse.json({ error: "Only lenders can generate agreements" }, { status: 403 })
    }

    // Get loan request with all necessary details
    const { data: loan, error: loanError } = await supabase
      .from("loan_requests")
      .select(`
        *,
        borrower:profiles!borrower_profile_id (
          id,
          full_name,
          email,
          phone_number,
          national_id_hash,
          date_of_birth,
          address
        ),
        lender:profiles!lender_profile_id (
          id,
          full_name,
          email,
          phone_number,
          business_name,
          business_registration_number,
          address
        ),
        country:countries (
          id,
          name,
          currency_code,
          currency_symbol
        )
      `)
      .eq("id", id)
      .eq("lender_profile_id", profile.id) // Ensure lender owns this loan
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: "Loan not found or unauthorized" }, { status: 404 })
    }

    // Parse the request body for loan terms
    const body = await request.json()
    const {
      loanAmount,
      interestRate,
      loanTerm,
      repaymentFrequency,
      collateralDescription,
      additionalTerms,
      latePaymentPenalty,
      defaultGracePeriod
    } = body

    // Validate required fields
    if (!loanAmount || !interestRate || !loanTerm || !repaymentFrequency) {
      return NextResponse.json({ 
        error: "Missing required loan terms" 
      }, { status: 400 })
    }

    // Generate the loan agreement PDF
    const agreementData = {
      loan,
      loanTerms: {
        loanAmount: parseFloat(loanAmount),
        interestRate: parseFloat(interestRate),
        loanTerm: parseInt(loanTerm),
        repaymentFrequency,
        collateralDescription: collateralDescription || "",
        additionalTerms: additionalTerms || "",
        latePaymentPenalty: parseFloat(latePaymentPenalty) || 5.0,
        defaultGracePeriod: parseInt(defaultGracePeriod) || 7
      }
    }

    const pdfBuffer = await generateLoanAgreementPDF(agreementData)

    // Store agreement record in database
    const { data: agreement, error: agreementError } = await supabase
      .from("loan_agreements")
      .insert({
        loan_request_id: loan.id,
        lender_id: profile.id,
        borrower_id: loan.borrower.id,
        loan_amount: parseFloat(loanAmount),
        interest_rate: parseFloat(interestRate),
        loan_term: parseInt(loanTerm),
        repayment_frequency: repaymentFrequency,
        collateral_description: collateralDescription,
        additional_terms: additionalTerms,
        late_payment_penalty: parseFloat(latePaymentPenalty) || 5.0,
        default_grace_period: parseInt(defaultGracePeriod) || 7,
        agreement_status: "generated",
        generated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (agreementError) {
      console.error("Error saving agreement:", agreementError)
      return NextResponse.json({ error: "Failed to save agreement" }, { status: 500 })
    }

    // Return the PDF as a downloadable response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="loan-agreement-${loan.id}.pdf"`
      }
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}