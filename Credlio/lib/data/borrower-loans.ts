import { createServerSupabaseClient } from "@/lib/supabase/server-app"

export async function getBorrowerLoans(borrowerId: string) {
  const supabase = createServerSupabaseClient()

  const { data: borrower_loans, error } = await supabase
    .from("borrower_loans")
    .select("*")
    .eq("borrower_id", borrowerId)

  if (error) {
    console.error(error)
    return []
  }

  return borrower_loans
}
