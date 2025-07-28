import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const PaymentReceiptPage = async ({ params }: { params: { paymentId: string } }) => {
  const supabase = createServerSupabaseClient()
  const { data: payment, error } = await supabase
    .from("payments")
    .select(`
      *,
      loan:loan_id (
        *,
        borrower:borrower_id (*)
      )
    `)
    .eq("id", params.paymentId)
    .single()

  if (error) {
    console.error("Error fetching payment:", error)
    return <div>Error: Could not load payment receipt.</div>
  }

  if (!payment) {
    return <div>Payment not found.</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Receipt</h1>

      <div className="mb-4">
        <strong>Payment ID:</strong> {payment.id}
      </div>

      <div className="mb-4">
        <strong>Amount:</strong> ${payment.amount}
      </div>

      <div className="mb-4">
        <strong>Date:</strong> {new Date(payment.created_at).toLocaleDateString()}
      </div>

      <div className="mb-4">
        <strong>Loan ID:</strong> {payment.loan_id}
      </div>

      {payment.loan && payment.loan.borrower && (
        <>
          <div className="mb-4">
            <strong>Borrower Name:</strong> {payment.loan.borrower.full_name}
          </div>
          <div className="mb-4">
            <strong>Borrower Email:</strong> {payment.loan.borrower.email}
          </div>
        </>
      )}

      {/* Add more details as needed */}
    </div>
  )
}

export default PaymentReceiptPage
