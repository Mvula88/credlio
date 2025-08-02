import { SupportedCountry } from "./bureau"

export interface Profile {
  id: string
  auth_user_id: string
  email: string
  full_name?: string
  role: "borrower" | "lender" | "admin" | "country_admin"
  country?: SupportedCountry
  detected_country?: SupportedCountry
  home_country?: SupportedCountry
  is_traveling?: boolean
  last_ip_address?: string
  last_ip_country?: SupportedCountry
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface CountryStatistics {
  id: string
  country: SupportedCountry
  date: string
  total_borrowers: number
  total_lenders: number
  active_loans: number
  total_loan_volume: number
  completed_loans: number
  defaulted_loans: number
  blacklisted_borrowers: number
  new_users_today: number
  active_subscriptions: number
  revenue_today: number
  created_at: string
  updated_at: string
}

export interface CountryAdmin {
  id: string
  user_id: string
  country: SupportedCountry
  assigned_by: string
  assigned_at: string
  is_active: boolean
  user?: Profile
}
