import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import type { LoanRequestWithTaggedBorrower, ProfileWithBadges } from "@/lib/types"
import { getBorrowerSmartTagsSimple } from "./smart-tags"
import { getUserBadgesSimple } from "./badges"

// Fetches loan requests for the marketplace.
// RLS policies `_lender_select` and `_country_admin_select` depend on user context.
export async function getMarketplaceLoanRequests(
  countryId: string
): Promise<LoanRequestWithTaggedBorrower[]> {
  const supabase = createServerSupabaseClient() // Use user-context client
  const { data, error } = await supabase
    .from("loan_requests")
    .select(
      `
      id,
      requested_at,
      loan_amount,
      currency_code,
      purpose,
      country_id,
      borrower_profile_id, 
      borrower:profiles!borrower_profile_id (
        id,
        full_name,
        trust_score,
        is_blacklisted
      )
    `
    )
    .eq("status", "pending_lender_acceptance")
    .eq("country_id", countryId)
    .order("requested_at", { ascending: false })

  if (error) {
    console.error("Error fetching marketplace loan requests:", error)
    throw new Error("Failed to fetch loan requests.")
  }

  const loanRequestsWithTagsAndBadges = await Promise.all(
    data.map(async (request) => {
      if (request.borrower_profile_id) {
        const smartTags = await getBorrowerSmartTagsSimple(request.borrower_profile_id)
        const badges = await getUserBadgesSimple(request.borrower_profile_id)

        return {
          ...request,
          borrower: request.borrower
            ? ({
                ...(Array.isArray(request.borrower) ? request.borrower[0] : request.borrower),
                smart_tags: smartTags,
                badges: badges,
              } as ProfileWithBadges)
            : null,
        }
      }
      return {
        ...request,
        borrower: request.borrower ? ({ ...(Array.isArray(request.borrower) ? request.borrower[0] : request.borrower) } as ProfileWithBadges) : null,
      }
    })
  )
  return loanRequestsWithTagsAndBadges as LoanRequestWithTaggedBorrower[]
}

// NEW FUNCTION: Get a single loan request by ID
export async function getLoanRequestById(
  requestId: string
): Promise<LoanRequestWithTaggedBorrower | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("loan_requests")
    .select(
      `
      id,
      requested_at,
      loan_amount,
      currency_code,
      purpose,
      repayment_terms,
      status,
      country_id,
      borrower_profile_id,
      borrower:profiles!borrower_profile_id (
        id,
        full_name,
        trust_score,
        is_blacklisted,
        email,
        phone_number,
        created_at
      )
    `
    )
    .eq("id", requestId)
    .single()

  if (error) {
    console.error(`Error fetching loan request ${requestId}:`, error)
    // RLS might prevent access, in which case returning null is appropriate
    if (error.code === "PGRST116") return null // "PGRST116" is for "0 results" from .single()
    throw new Error("Failed to fetch loan request details.")
  }
  if (!data) return null

  let borrowerWithDetails: ProfileWithBadges | null = null
  if (data.borrower) {
    const borrowerData = Array.isArray(data.borrower) ? data.borrower[0] : data.borrower
    const smartTags = await getBorrowerSmartTagsSimple(borrowerData.id)
    const badges = await getUserBadgesSimple(borrowerData.id)
    borrowerWithDetails = {
      ...borrowerData,
      smart_tags: smartTags,
      badges: badges,
    } as ProfileWithBadges
  }

  return {
    ...data,
    borrower: borrowerWithDetails,
  } as LoanRequestWithTaggedBorrower
}
