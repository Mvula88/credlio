import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { ActiveLoansClient } from "./client"

export const dynamic = "force-dynamic"

export default async function ActiveLoansPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Fetch active loans from Supabase
  const { data: loans, error } = await supabase
    .from("loans")
    .select(`
      *,
      borrower:profiles!loans_borrower_id_fkey(
        id,
        full_name,
        email,
        phone,
        profile_picture_url,
        credit_score,
        country:countries(
          name,
          flag_emoji,
          currency_code
        )
      ),
      repayments:loan_repayments(
        id,
        amount,
        payment_date,
        status
      )
    `)
    .eq("lender_id", profile.id)
    .in("status", ["active", "overdue"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching loans:", error)
  }

  // Calculate loan statistics
  const stats = {
    totalActive: loans?.length || 0,
    totalAmount: loans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0,
    overdueCount: loans?.filter(loan => loan.status === "overdue").length || 0,
    averageInterestRate: loans?.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / (loans?.length || 1) || 0,
  }

  return <ActiveLoansClient loans={loans || []} stats={stats} />
}