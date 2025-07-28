// A simplified type for a Profile
export type Profile = {
  id: string
  full_name: string | null
  trust_score: number | null
  is_blacklisted?: boolean
  email?: string // Added for lender profile in offer
  phone_number?: string // Added for lender profile in offer
  created_at?: string // Added for lender profile in offer
}

// A type for a Loan Request that includes the nested borrower profile
export type LoanRequestWithBorrower = {
  id: string
  requested_at: string
  loan_amount: number
  currency_code: string
  purpose: string | null
  repayment_terms?: string | null // Added from loan request details page
  status: string // Added from loan request details page
  country_id: string // Added from loan request list
  borrower_profile_id?: string // Added from loan request details page
  borrower: ProfileWithBadges | null // Updated to ProfileWithBadges
}

// Type for notifications
export type Notification = {
  id: number
  type:
    | "loan_status_update"
    | "repayment_reminder"
    | "blacklist_warning"
    | "blacklist_status_update"
    | "new_marketplace_loan"
    | "watchlist_update"
    | "new_message"
    | "dispute_alert"
    | "new_loan_offer" // New notification type
    | "offer_accepted" // New notification type
    | "offer_rejected" // New notification type
    | "payment_initiated" // New notification type
    | "payment_confirmed" // New notification type
    | "payment_failed" // New notification type
    | "payment_due_reminder" // New notification type
  title: string
  message: string
  reference_url?: string
  is_read: boolean
  read_at?: string
  created_at: string
}

// Define NotificationType for createNotificationEntry function
export type NotificationType = Notification["type"]

// Type for watchlist entries
export type WatchlistEntry = {
  lender_profile_id: string
  borrower_profile_id: string
  country_id: string
  notes?: string
  added_at: string
  borrower?: Profile
}

// Types for smart tags
export type SmartTag = {
  id: string
  tag_name: string
  description: string | null
  badge_color: string | null
  created_at: string
}

export type BorrowerSmartTag = {
  borrower_profile_id: string
  smart_tag_id: string
  country_id: string
  assigned_at: string
  assigned_automatically: boolean
  assigned_by_profile_id: string | null
  tag?: SmartTag // For joined queries
}

// Extended Profile type with smart tags
export type ProfileWithTags = Profile & {
  smart_tags?: SmartTag[]
}

// Extended LoanRequest type with borrower that has smart tags
export type LoanRequestWithTaggedBorrower = Omit<LoanRequestWithBorrower, "borrower"> & {
  borrower: ProfileWithBadges | null
}

// Type for Audit Log entries
export type AuditLogEntry = {
  id: number
  actor_profile_id?: string | null
  actor_role?: string | null
  action: string
  target_profile_id?: string | null
  target_resource_id?: string | null
  target_resource_type?: string | null
  secondary_target_resource_id?: string | null // Added for loan_offers audit
  secondary_target_resource_type?: string | null // Added for loan_offers audit
  country_id?: string | null
  details?: Record<string, any> | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  actor?: Profile | null // For joined queries
  target_profile?: Profile | null // For joined queries
  country?: { name: string } | null // For joined queries
}

// New types for reputation badges
export type ReputationBadge = {
  id: string
  badge_name: string
  description: string | null
  icon_url: string | null
  badge_type: "borrower" | "lender" | "general"
  created_at: string
}

export type UserBadge = {
  profile_id: string
  badge_id: string
  country_id: string
  awarded_at: string
  awarded_by_profile_id: string | null
  expires_at: string | null
  badge?: ReputationBadge // For joined queries
}

// Extended Profile type with badges
export type ProfileWithBadges = ProfileWithTags & {
  badges?: ReputationBadge[]
}

// Generic LoanRequest type (can be used by MakeOfferForm)
export type LoanRequest = {
  id: string
  loan_amount: number
  currency_code: string
  repayment_terms?: string | null
  country_id: string // Added for MakeOfferForm
  status: string // Added for MakeOfferForm
  borrower?: ProfileWithBadges | null // Added for MakeOfferForm
}

// LoanOffer type
export type LoanOffer = {
  id: string
  loan_request_id: string
  lender_profile_id: string
  country_id: string
  offer_amount: number
  interest_rate: number
  repayment_terms_proposed: string
  offer_status:
    | "pending_borrower_acceptance"
    | "accepted_by_borrower"
    | "rejected_by_borrower"
    | "withdrawn_by_lender"
    | "expired"
  notes_to_borrower?: string | null
  created_at: string
  updated_at: string
  lender?: Profile // For joining lender details
}

// LoanRequest type for borrower dashboard, including offers
export type LoanRequestForBorrower = LoanRequestWithBorrower & {
  offers?: LoanOffer[]
}

// NEW: LoanPayment type
export type LoanPayment = {
  id: string
  loan_request_id: string
  borrower_profile_id: string
  lender_profile_id: string
  country_id: string
  amount_due: number
  currency_code: string
  due_date: string
  amount_paid?: number | null
  payment_date?: string | null
  payment_status: "scheduled" | "pending_confirmation" | "completed" | "failed" | "overdue" | "reversed"
  payment_method?: string | null
  transaction_reference?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  loan_request?: {
    id: string
    purpose?: string | null
  }
}
