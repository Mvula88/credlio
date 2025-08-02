import { createServerSupabaseClient } from "@/lib/supabase/server-client"

const BorrowerPaymentsPage = async () => {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <div>
      <h1>Borrower Payments</h1>
      {session ? (
        <p>Welcome, {session.user.email}!</p>
      ) : (
        <p>Please sign in to view your payments.</p>
      )}
    </div>
  )
}

export default BorrowerPaymentsPage
