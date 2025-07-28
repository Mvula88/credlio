import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// Fix dynamic server usage
export const dynamic = "force-dynamic"

const PaymentsPage = async () => {
  const supabase = createServerSupabaseClient()
  const { data: payments, error } = await supabase.from("payments").select("*")

  if (error) {
    console.error("Error fetching payments:", error)
    return <div>Error fetching payments</div>
  }

  return (
    <div>
      <h1>Payments</h1>
      {payments && payments.length > 0 ? (
        <ul>
          {payments.map((payment) => (
            <li key={payment.id}>
              Payment ID: {payment.id}, Amount: {payment.amount}, Status: {payment.status}
            </li>
          ))}
        </ul>
      ) : (
        <div>No payments found.</div>
      )}
    </div>
  )
}

export default PaymentsPage
