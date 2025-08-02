import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export default async function PaymentPage({ params }: { params: { paymentId: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", params.paymentId)
    .single()

  if (error) {
    console.error(error)
    return <div>Error fetching payment</div>
  }

  if (!payment) {
    return <div>Payment not found</div>
  }

  return (
    <div>
      <h1>Payment Details</h1>
      <p>Payment ID: {payment.id}</p>
      <p>Amount: {payment.amount}</p>
      <p>Status: {payment.status}</p>
      {/* Add more payment details here */}
    </div>
  )
}
