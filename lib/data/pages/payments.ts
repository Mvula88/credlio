import { createPagesSupabaseClient } from "@/lib/supabase/server-pages"
import type { GetServerSidePropsContext } from "next"
import type { Database } from "@/lib/types/database"

type Payment = Database["public"]["Tables"]["loan_payments"]["Row"]

export async function getPaymentsForPages(context: GetServerSidePropsContext) {
  const supabase = createPagesSupabaseClient(context)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: payments, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan:loans(
        borrower:profiles!loans_borrower_id_fkey(full_name),
        lender:profiles!loans_lender_id_fkey(full_name)
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching payments:", error)
    return []
  }

  return payments || []
}

export async function getPaymentByIdForPages(paymentId: string, context: GetServerSidePropsContext) {
  const supabase = createPagesSupabaseClient(context)

  const { data: payment, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan:loans(
        *,
        borrower:profiles!loans_borrower_id_fkey(*),
        lender:profiles!loans_lender_id_fkey(*)
      )
    `)
    .eq("id", paymentId)
    .single()

  if (error) {
    console.error("Error fetching payment:", error)
    return null
  }

  return payment
}
