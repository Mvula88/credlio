import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { GenerateLoanAgreement } from "@/components/lender/generate-loan-agreement"
import { notFound, redirect } from "next/navigation"

export default async function GenerateAgreementPage({ 
  params 
}: { 
  params: { loanId: string } 
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

  if (!profile || profile.role !== 'lender') {
    notFound()
  }

  // Get loan request details
  const { data: loanRequest, error } = await supabase
    .from('loan_requests')
    .select(`
      id,
      amount_requested,
      purpose,
      status,
      created_at,
      borrower:profiles!borrower_profile_id (
        id,
        full_name,
        email,
        phone_number,
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
    .eq('id', params.loanId)
    .eq('lender_profile_id', profile.id) // Ensure lender owns this loan
    .single()

  if (error || !loanRequest) {
    console.error('Error fetching loan request:', error)
    notFound()
  }

  // Check if agreement already exists
  const { data: existingAgreement } = await supabase
    .from('loan_agreements')
    .select('id, agreement_status, generated_at')
    .eq('loan_request_id', params.loanId)
    .single()

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Generate Loan Agreement</h1>
        <p className="text-muted-foreground">
          Create a legally binding agreement for loan request #{loanRequest.id.substring(0, 8)}
        </p>
      </div>

      {existingAgreement && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> An agreement already exists for this loan (Status: {existingAgreement.agreement_status}). 
            Generating a new agreement will replace the existing one.
          </p>
        </div>
      )}

      <GenerateLoanAgreement 
        loanRequest={loanRequest}
        onAgreementGenerated={(agreementId) => {
          // Redirect to loan details or agreements list
          window.location.href = `/lender/loans/${params.loanId}`
        }}
      />
    </div>
  )
}