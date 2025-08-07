import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { LoanAgreementSignature } from "@/components/borrower/loan-agreement-signature"
import { notFound, redirect } from "next/navigation"

export default async function SignAgreementPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createServerSupabaseClient()
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', session.user.id)
    .single()

  if (!profile || profile.role !== 'borrower') {
    notFound()
  }

  // Get loan agreement details
  const { data: agreement, error } = await supabase
    .from('loan_agreements')
    .select(`
      id,
      agreement_number,
      loan_amount,
      interest_rate,
      loan_term,
      repayment_frequency,
      late_payment_penalty,
      default_grace_period,
      agreement_status,
      generated_at,
      borrower_signed,
      lender:profiles!lender_id (
        id,
        full_name,
        business_name,
        email
      ),
      loan_request:loan_requests!loan_request_id (
        id,
        country:countries (
          name,
          currency_code,
          currency_symbol
        )
      )
    `)
    .eq('id', params.id)
    .eq('borrower_id', profile.id) // Ensure borrower owns this agreement
    .single()

  if (error || !agreement) {
    console.error('Error fetching agreement:', error)
    notFound()
  }

  // Check if already signed
  if (agreement.borrower_signed) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-700 mb-4">Agreement Already Signed</h1>
          <p className="text-muted-foreground mb-6">
            This agreement has already been signed on {new Date(agreement.signed_at).toLocaleDateString()}.
          </p>
          <a 
            href="/borrower/dashboard" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Transform data for component
  const agreementData = {
    id: agreement.id,
    agreement_number: agreement.agreement_number,
    loan_amount: agreement.loan_amount,
    interest_rate: agreement.interest_rate,
    loan_term: agreement.loan_term,
    repayment_frequency: agreement.repayment_frequency,
    late_payment_penalty: agreement.late_payment_penalty,
    default_grace_period: agreement.default_grace_period,
    agreement_status: agreement.agreement_status,
    generated_at: agreement.generated_at,
    lender: agreement.lender,
    country: agreement.loan_request.country
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sign Loan Agreement</h1>
        <p className="text-muted-foreground">
          Agreement #{agreement.agreement_number} from {agreement.lender.business_name || agreement.lender.full_name}
        </p>
      </div>

      <LoanAgreementSignature 
        agreement={agreementData}
        onAgreementSigned={() => {
          // Redirect to dashboard after signing
          window.location.href = '/borrower/dashboard'
        }}
      />
    </div>
  )
}