import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { MarketplaceClient } from "./client"

export const dynamic = "force-dynamic"

export default async function MarketplacePage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  // Check subscription tier
  const { data: subscription } = await supabase
    .from("lender_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("lender_id", profile.id)
    .eq("status", "active")
    .single()

  const subscriptionTier = subscription?.plan?.tier || 0

  // Only fetch loan requests if user has premium subscription
  if (subscriptionTier < 2) {
    return <MarketplaceClient loanRequests={[]} isPremium={false} />
  }

  // Fetch active loan requests from borrowers
  const { data: loanRequests, error } = await supabase
    .from("loan_requests")
    .select(`
      *,
      borrower:profiles!loan_requests_borrower_profile_id_fkey(
        id,
        full_name,
        email,
        phone,
        profile_picture_url,
        credit_score,
        verified,
        country:countries(
          name,
          flag_emoji,
          currency_code
        )
      ),
      country:countries(
        name,
        flag_emoji,
        currency_code
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching loan requests:", error)
  }

  // Get lender's country for smart matching
  const { data: lenderCountry } = await supabase
    .from("countries")
    .select("*")
    .eq("id", profile.country_id)
    .single()

  // Sort loan requests with smart matching (same country first)
  const sortedRequests = loanRequests?.sort((a, b) => {
    const aIsLocal = a.country?.id === lenderCountry?.id ? -1 : 0
    const bIsLocal = b.country?.id === lenderCountry?.id ? -1 : 0
    return aIsLocal - bIsLocal
  }) || []

  return <MarketplaceClient loanRequests={sortedRequests} isPremium={true} />
}