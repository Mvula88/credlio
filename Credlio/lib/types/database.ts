export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      countries: {
        Row: {
          id: string
          name: string
          code: string
          currency_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          currency_code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          currency_code?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          full_name: string | null
          phone_number: string | null
          country_id: string | null
          address: string | null
          date_of_birth: string | null
          national_id: string | null
          profile_picture_url: string | null
          is_verified: boolean
          verification_documents: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          full_name?: string | null
          phone_number?: string | null
          country_id?: string | null
          address?: string | null
          date_of_birth?: string | null
          national_id?: string | null
          profile_picture_url?: string | null
          is_verified?: boolean
          verification_documents?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          full_name?: string | null
          phone_number?: string | null
          country_id?: string | null
          address?: string | null
          date_of_birth?: string | null
          national_id?: string | null
          profile_picture_url?: string | null
          is_verified?: boolean
          verification_documents?: any[]
          created_at?: string
          updated_at?: string
        }
      }
      user_profile_roles: {
        Row: {
          id: string
          profile_id: string
          role_id: string
          assigned_at: string
          assigned_by: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          role_id: string
          assigned_at?: string
          assigned_by?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          role_id?: string
          assigned_at?: string
          assigned_by?: string | null
        }
      }
      loan_requests: {
        Row: {
          id: string
          borrower_profile_id: string
          amount: number
          currency_code: string
          purpose: string
          duration_months: number
          interest_rate: number | null
          collateral_description: string | null
          status: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          borrower_profile_id: string
          amount: number
          currency_code: string
          purpose: string
          duration_months: number
          interest_rate?: number | null
          collateral_description?: string | null
          status?: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          borrower_profile_id?: string
          amount?: number
          currency_code?: string
          purpose?: string
          duration_months?: number
          interest_rate?: number | null
          collateral_description?: string | null
          status?: string
          created_at?: string
          expires_at?: string
        }
      }
      loan_offers: {
        Row: {
          id: string
          loan_request_id: string
          lender_profile_id: string
          offered_amount: number
          interest_rate: number
          duration_months: number
          terms_conditions: string | null
          status: string
          created_at: string
          expires_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          loan_request_id: string
          lender_profile_id: string
          offered_amount: number
          interest_rate: number
          duration_months: number
          terms_conditions?: string | null
          status?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          loan_request_id?: string
          lender_profile_id?: string
          offered_amount?: number
          interest_rate?: number
          duration_months?: number
          terms_conditions?: string | null
          status?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
      }
      loan_payments: {
        Row: {
          id: string
          loan_offer_id: string
          borrower_profile_id: string
          lender_profile_id: string
          amount_due: number
          amount_paid: number
          currency_code: string
          due_date: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          loan_offer_id: string
          borrower_profile_id: string
          lender_profile_id: string
          amount_due: number
          amount_paid?: number
          currency_code: string
          due_date: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          loan_offer_id?: string
          borrower_profile_id?: string
          lender_profile_id?: string
          amount_due?: number
          amount_paid?: number
          currency_code?: string
          due_date?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      blacklisted_borrowers: {
        Row: {
          id: string
          borrower_profile_id: string
          reported_by_profile_id: string | null
          reason: string
          reason_category: string
          description: string
          evidence_urls: any[]
          severity_level: string
          is_system_generated: boolean
          is_verified: boolean
          verified_by: string | null
          verified_at: string | null
          deregistered: boolean
          deregistered_by: string | null
          deregistered_at: string | null
          deregistration_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          borrower_profile_id: string
          reported_by_profile_id?: string | null
          reason: string
          reason_category: string
          description: string
          evidence_urls?: any[]
          severity_level?: string
          is_system_generated?: boolean
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          deregistered?: boolean
          deregistered_by?: string | null
          deregistered_at?: string | null
          deregistration_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          borrower_profile_id?: string
          reported_by_profile_id?: string | null
          reason?: string
          reason_category?: string
          description?: string
          evidence_urls?: any[]
          severity_level?: string
          is_system_generated?: boolean
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          deregistered?: boolean
          deregistered_by?: string | null
          deregistered_at?: string | null
          deregistration_reason?: string | null
          created_at?: string
        }
      }
      borrower_invitations: {
        Row: {
          id: string
          lender_profile_id: string
          invitation_code: string
          borrower_name: string | null
          borrower_phone: string | null
          borrower_email: string | null
          loan_amount: number | null
          currency_code: string | null
          custom_message: string | null
          status: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lender_profile_id: string
          invitation_code: string
          borrower_name?: string | null
          borrower_phone?: string | null
          borrower_email?: string | null
          loan_amount?: number | null
          currency_code?: string | null
          custom_message?: string | null
          status?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lender_profile_id?: string
          invitation_code?: string
          borrower_name?: string | null
          borrower_phone?: string | null
          borrower_email?: string | null
          loan_amount?: number | null
          currency_code?: string | null
          custom_message?: string | null
          status?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          metadata?: any
          created_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          lender_profile_id: string
          borrower_profile_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lender_profile_id: string
          borrower_profile_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lender_profile_id?: string
          borrower_profile_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      smart_tags: {
        Row: {
          id: string
          profile_id: string
          tag_name: string
          tag_value: string | null
          tag_type: string
          confidence_score: number
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          tag_name: string
          tag_value?: string | null
          tag_type: string
          confidence_score?: number
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          tag_name?: string
          tag_value?: string | null
          tag_type?: string
          confidence_score?: number
          created_by?: string
          created_at?: string
        }
      }
      reputation_badges: {
        Row: {
          id: string
          profile_id: string
          badge_type: string
          badge_name: string
          description: string | null
          criteria_met: any
          earned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          profile_id: string
          badge_type: string
          badge_name: string
          description?: string | null
          criteria_met?: any
          earned_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          profile_id?: string
          badge_type?: string
          badge_name?: string
          description?: string | null
          criteria_met?: any
          earned_at?: string
          is_active?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          profile_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: any | null
          new_values: any | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: any | null
          new_values?: any | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
