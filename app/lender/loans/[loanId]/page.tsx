import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export default async function LoanDetails({ params }: { params: { loanId: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: loan, error } = await supabase
    .from("loans")
    .select(`
      *,
      borrower (
        *
      )
    `)
    .eq("id", params.loanId)
    .single()

  if (error) {
    console.error(error)
    return <div>Error loading loan</div>
  }

  if (!loan) {
    return <div>Loan not found</div>
  }

  return (
    <div>
      <h1>Loan Details</h1>
      <p>Loan ID: {loan.id}</p>
      <p>Amount: {loan.amount}</p>
      <p>Interest Rate: {loan.interest_rate}</p>
      <p>Term: {loan.term}</p>
      <p>Borrower Name: {loan.borrower?.name}</p>
      {/* Display other loan details here */}
    </div>
  )
}
