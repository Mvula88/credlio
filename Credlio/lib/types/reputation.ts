// Reputation Platform Types

export interface LoanRequest {
  id: string
  borrower_id: string
  amount: number
  currency: string
  purpose: string
  description?: string
  repayment_period: number // in days
  interest_rate?: number
  status: "active" | "fulfilled" | "cancelled" | "expired"
  created_at: string
  updated_at: string
  expires_at: string
  borrower?: {
    id: string
    full_name: string
    email: string
  }
}

export interface LoanOffer {
  id: string
  loan_request_id: string
  lender_id: string
  borrower_id: string
  amount: number
  interest_rate: number
  repayment_period: number
  terms?: string
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "expired"
  created_at: string
  updated_at: string
  expires_at: string
  loan_request?: LoanRequest
  lender?: {
    id: string
    full_name: string
    email: string
  }
  borrower?: {
    id: string
    full_name: string
    email: string
  }
}

export interface ActiveLoan {
  id: string
  loan_offer_id: string
  borrower_id: string
  lender_id: string
  principal_amount: number
  interest_rate: number
  total_amount: number
  repayment_date: string
  status: "active" | "completed" | "overdue" | "defaulted"
  created_at: string
  completed_at?: string
  borrower?: {
    id: string
    full_name: string
    email: string
  }
  lender?: {
    id: string
    full_name: string
    email: string
  }
}

export interface LoanBehavior {
  id: string
  loan_id: string
  borrower_id: string
  lender_id: string
  behavior_type: "on_time" | "late" | "very_late" | "defaulted" | "early"
  due_date: string
  actual_payment_date?: string
  days_late: number
  notes?: string
  created_at: string
}

export interface Blacklist {
  id: string
  borrower_id: string
  blacklisted_by: string
  reason: "repeated_defaults" | "fraud" | "false_information" | "harassment" | "other"
  evidence: string
  details?: string
  is_system_generated: boolean
  status: "active" | "appealed" | "removed"
  created_at: string
  updated_at: string
  blacklisted_by_profile?: {
    id: string
    full_name: string
    email: string
  }
}

export interface DocumentChecklist {
  id: string
  loan_offer_id: string
  lender_id: string
  borrower_id: string
  national_id_verified: boolean
  proof_of_income_verified: boolean
  proof_of_address_verified: boolean
  bank_statement_verified: boolean
  employment_letter_verified: boolean
  guarantor_verified: boolean
  additional_notes?: string
  last_updated: string
  created_at: string
}

export interface BorrowerStats {
  borrower_id: string
  total_loans: number
  completed_loans: number
  active_loans: number
  defaulted_loans: number
  on_time_payments: number
  late_payments: number
  very_late_payments: number
  reputation_score: number
  is_blacklisted: boolean
  blacklist_count: number
  last_loan_date?: string
  updated_at: string
}

export interface BorrowerReputation {
  borrower_id: string
  reputation_score: number
  total_loans: number
  completed_loans: number
  active_loans: number
  defaulted_loans: number
  on_time_rate: number
  is_blacklisted: boolean
  blacklist_details?: Array<{
    blacklisted_by: string
    reason: string
    date: string
    is_system: boolean
  }>
  recent_behaviors?: Array<{
    behavior_type: string
    due_date: string
    payment_date?: string
    days_late: number
  }>
}
