import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { ActiveLoansClient } from "./client"

export const dynamic = "force-dynamic"

export default async function BorrowerActiveLoansPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Fetch active loans for the borrower
  const { data: loans, error } = await supabase
    .from("loans")
    .select(`
      *,
      lender:profiles!loans_lender_id_fkey(
        id,
        full_name,
        email,
        phone,
        company_name,
        profile_picture_url
      ),
      repayments:loan_repayments(
        id,
        amount,
        payment_date,
        status,
        payment_method
      )
    `)
    .eq("borrower_id", profile.id)
    .in("status", ["active", "overdue"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching loans:", error)
  }

  // Calculate loan statistics
  const stats = {
    totalActive: loans?.length || 0,
    totalOwed: loans?.reduce((sum, loan) => {
      const totalAmount = loan.amount * (1 + (loan.interest_rate || 0) / 100)
      const totalRepaid = loan.repayments?.reduce((repaidSum: number, payment: any) => 
        payment.status === "completed" ? repaidSum + payment.amount : repaidSum, 0) || 0
      return sum + (totalAmount - totalRepaid)
    }, 0) || 0,
    overdueCount: loans?.filter(loan => loan.status === "overdue").length || 0,
    nextPaymentAmount: 0,
    nextPaymentDate: null as string | null,
  }

  // Find next payment
  if (loans && loans.length > 0) {
    const sortedLoans = [...loans].sort((a, b) => 
      new Date(a.next_payment_date || a.due_date).getTime() - 
      new Date(b.next_payment_date || b.due_date).getTime()
    )
    const nextLoan = sortedLoans[0]
    if (nextLoan) {
      stats.nextPaymentAmount = nextLoan.monthly_payment || (nextLoan.amount / nextLoan.duration_months)
      stats.nextPaymentDate = nextLoan.next_payment_date || nextLoan.due_date
    }
  }

  return <ActiveLoansClient loans={loans || []} stats={stats} profile={profile} />
}