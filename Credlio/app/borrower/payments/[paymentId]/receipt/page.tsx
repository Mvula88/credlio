import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const PaymentReceiptPage = async ({ params }: { params: { paymentId: string } }) => {
  const supabase = createServerSupabaseClient()
  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      `
      *,
      borrower (
        *
      ),
      loan (
        *
      )
    `
    )
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
      <h1 className="mb-4 text-2xl font-bold">Payment Receipt</h1>

      <div className="mb-4">
        <strong>Payment ID:</strong> {payment.id}
      </div>

      <div className="mb-4">
        <strong>Borrower:</strong> {payment.borrower?.first_name} {payment.borrower?.last_name}
      </div>

      <div className="mb-4">
        <strong>Loan ID:</strong> {payment.loan?.id}
      </div>

      <div className="mb-4">
        <strong>Amount Paid:</strong> ${payment.amount}
      </div>

      <div className="mb-4">
        <strong>Payment Date:</strong> {new Date(payment.created_at).toLocaleDateString()}
      </div>

      {/* Add more details as needed */}
    </div>
  )
}

export default PaymentReceiptPage
