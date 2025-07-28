import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import type { LoanPayment } from "@/lib/types"

// Get payments for a specific loan request
export async function getLoanPayments(loanRequestId: string): Promise<LoanPayment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("loan_payments")
    .select("*")
    .eq("loan_request_id", loanRequestId)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching loan payments:", error)
    throw new Error("Failed to fetch loan payments.")
  }

  return data as LoanPayment[]
}

// Get upcoming payments for a borrower
export async function getBorrowerUpcomingPayments(borrowerProfileId: string, limit = 5): Promise<LoanPayment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        id,
        purpose
      )
    `)
    .eq("borrower_profile_id", borrowerProfileId)
    .in("payment_status", ["scheduled", "pending_confirmation"])
    .gte("due_date", new Date().toISOString().split("T")[0]) // Today or future
    .order("due_date", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching upcoming payments:", error)
    throw new Error("Failed to fetch upcoming payments.")
  }

  return data as LoanPayment[]
}

// Get upcoming payments for a lender
export async function getLenderUpcomingPayments(lenderProfileId: string, limit = 5): Promise<LoanPayment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        id,
        purpose
      )
    `)
    .eq("lender_profile_id", lenderProfileId)
    .in("payment_status", ["scheduled", "pending_confirmation"])
    .gte("due_date", new Date().toISOString().split("T")[0]) // Today or future
    .order("due_date", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching lender upcoming payments:", error)
    throw new Error("Failed to fetch lender upcoming payments.")
  }

  return data as LoanPayment[]
}

// Get payment history for a borrower
export async function getBorrowerPaymentHistory(borrowerProfileId: string, limit = 10): Promise<LoanPayment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_request:loan_requests (
        id,
        purpose
      )
    `)
    .eq("borrower_profile_id", borrowerProfileId)
    .in("payment_status", ["completed", "failed", "reversed"])
    .order("payment_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching payment history:", error)
    throw new Error("Failed to fetch payment history.")
  }

  return data as LoanPayment[]
}

// Initiate a payment (for borrowers)
export async function initiatePayment(
  paymentId: string,
  paymentMethod: string,
  transactionReference?: string,
  notes?: string,
): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from("loan_payments")
    .update({
      payment_status: "pending_confirmation",
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
      notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)

  if (error) {
    console.error("Error initiating payment:", error)
    return false
  }

  return true
}

// Confirm a payment (for lenders)
export async function confirmPayment(paymentId: string, amountPaid: number, notes?: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from("loan_payments")
    .update({
      payment_status: "completed",
      amount_paid: amountPaid,
      payment_date: new Date().toISOString(),
      notes: notes ? `${notes} (confirmed)` : "(confirmed)",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("payment_status", "pending_confirmation") // Only confirm pending payments

  if (error) {
    console.error("Error confirming payment:", error)
    return false
  }

  return true
}

// Mark payment as failed (for lenders)
export async function markPaymentAsFailed(paymentId: string, notes?: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from("loan_payments")
    .update({
      payment_status: "failed",
      notes: notes ? `${notes} (marked as failed)` : "(marked as failed)",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("payment_status", "pending_confirmation") // Only fail pending payments

  if (error) {
    console.error("Error marking payment as failed:", error)
    return false
  }

  return true
}

// Add this function to get all payments for admin
export async function getAllPayments(limit = 100) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from("loan_payments")
    .select("*")
    .order("due_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching all payments:", error)
    return []
  }

  return data || []
}
