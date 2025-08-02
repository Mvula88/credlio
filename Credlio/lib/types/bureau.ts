// Professional Reputation Bureau Types

export type SupportedCountry =
  | "NG"
  | "KE"
  | "UG"
  | "ZA"
  | "GH"
  | "TZ"
  | "RW"
  | "ZM"
  | "NA"
  | "BW"
  | "MW"
  | "SN"
  | "ET"
  | "CM"
  | "SL"
  | "ZW"

export interface Country {
  code: SupportedCountry
  name: string
  flag: string
  currency_code: string
  currency_symbol: string
  timezone: string
  active: boolean
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  tier: number // 1 = Basic ($15), 2 = Premium ($22)
  features: {
    reputation_reports: boolean
    blacklist_access: boolean
    affordability_calculator: boolean
    marketplace_access: boolean
    max_reports_per_month: number // -1 for unlimited
    smart_matching?: boolean
    priority_support?: boolean
  }
  currency_prices?: Record<string, number>
  supported_countries?: SupportedCountry[]
  stripe_price_id?: string
  stripe_product_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LenderSubscription {
  id: string
  lender_id: string
  plan_id: string
  status: "active" | "cancelled" | "expired" | "trial"
  current_period_start: string
  current_period_end: string
  stripe_subscription_id?: string
  stripe_price_id?: string
  trial_end?: string
  cancel_at_period_end?: boolean
  canceled_at?: string
  country?: SupportedCountry
  created_at: string
  updated_at: string
  plan?: SubscriptionPlan
}

export interface LoanRequest {
  id: string
  borrower_id: string
  amount: number
  currency: string
  purpose: string
  description?: string
  repayment_period: number // in days
  interest_rate?: number
  monthly_income?: number
  employment_status?: "employed" | "self_employed" | "unemployed" | "student" | "retired"
  status: "active" | "matched" | "fulfilled" | "cancelled" | "expired"
  visibility_criteria?: Record<string, any>
  country?: SupportedCountry
  created_at: string
  updated_at: string
  expires_at: string
  borrower?: {
    id: string
    full_name: string
    email: string
  }
  reputation?: {
    reputation_score: number
    reputation_category: "GOOD" | "MODERATE" | "BAD"
    is_blacklisted: boolean
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
  country?: SupportedCountry
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

export interface LoanTracker {
  id: string
  loan_offer_id: string
  borrower_id: string
  lender_id: string
  principal_amount: number
  interest_rate: number
  total_amount: number
  amount_paid: number
  repayment_schedule: Array<{
    payment_number: number
    due_date: string
    amount: number
    status: "pending" | "paid" | "overdue"
  }>
  next_payment_date?: string
  next_payment_amount?: number
  status: "active" | "completed" | "overdue" | "defaulted"
  country?: SupportedCountry
  created_at: string
  completed_at?: string
  last_payment_date?: string
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

export interface Repayment {
  id: string
  loan_tracker_id: string
  borrower_id: string
  lender_id: string
  amount: number
  payment_date: string
  due_date: string
  days_late: number
  payment_method?: string
  status: "on_time" | "late" | "very_late" | "partial"
  notes?: string
  created_at: string
}

export interface AffordabilityMetrics {
  id: string
  borrower_id: string
  monthly_salary: number
  side_hustle_income: number
  remittances: number
  other_income: number
  total_monthly_income: number
  monthly_expenses: number
  existing_loan_payments: number
  disposable_income: number
  debt_to_income_ratio?: number
  risk_score?: number
  last_updated: string
  created_at: string
}

export interface BorrowerReputation {
  id: string
  borrower_id: string
  total_loans: number
  completed_loans: number
  active_loans: number
  defaulted_loans: number
  on_time_payments: number
  late_payments: number
  very_late_payments: number
  total_borrowed: number
  total_repaid: number
  average_days_late: number
  reputation_score: number // 0-100
  reputation_category: "GOOD" | "MODERATE" | "BAD"
  is_blacklisted: boolean
  blacklist_count: number
  last_loan_date?: string
  updated_at: string
}

export interface Blacklist {
  id: string
  borrower_id: string
  blacklisted_by: string
  loan_tracker_id?: string
  reason: "missed_payments" | "fraud" | "false_information" | "harassment" | "other"
  evidence: Record<string, any>
  auto_generated: boolean
  missed_payment_count?: number
  total_amount_defaulted?: number
  status: "active" | "appealed" | "removed"
  country?: SupportedCountry
  created_at: string
  updated_at: string
  blacklisted_by_profile?: {
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

export interface BorrowerInvite {
  id: string
  lender_id: string
  borrower_phone: string
  borrower_name?: string
  invite_code: string
  whatsapp_link?: string
  status: "pending" | "accepted" | "expired"
  accepted_by?: string
  country?: SupportedCountry
  created_at: string
  accepted_at?: string
  expires_at: string
  lender?: {
    id: string
    full_name: string
    email: string
  }
}

export interface LenderBorrowerConnection {
  id: string
  lender_id: string
  borrower_id: string
  connection_type: "direct" | "invited" | "marketplace"
  invite_id?: string
  created_at: string
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

// Comprehensive Borrower Report for Lenders
export interface BorrowerReport {
  borrower: {
    id: string
    full_name: string
    email: string
    created_at: string
  }
  reputation: BorrowerReputation
  affordability: AffordabilityMetrics | null
  active_loans: LoanTracker[]
  repayment_history: Repayment[]
  blacklist_entries: Blacklist[]
  risk_assessment: {
    overall_risk: "LOW" | "MEDIUM" | "HIGH"
    factors: Array<{
      factor: string
      impact: "POSITIVE" | "NEGATIVE"
      description: string
    }>
    recommendations: string[]
  }
}
