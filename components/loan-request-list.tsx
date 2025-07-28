import type { LoanRequestWithTaggedBorrower } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WatchlistButton } from "./watchlist-button"
import { isInWatchlist } from "@/lib/data/watchlist"
import { SmartTagsDisplay } from "./smart-tags-display"
import { ReputationBadgesDisplay } from "./reputation-badges-display"
import Link from "next/link" // 1. Import Link

interface LoanRequestListProps {
  loanRequests: LoanRequestWithTaggedBorrower[]
  lenderProfileId: string
}

export async function LoanRequestList({ loanRequests, lenderProfileId }: LoanRequestListProps) {
  if (!loanRequests || loanRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No loan requests in the marketplace</h3>
        <p className="mt-1 text-sm text-gray-500">Check back later for new requests.</p>
      </div>
    )
  }

  // Pre-fetch watchlist status for all borrowers in the list
  const watchlistStatuses = await Promise.all(
    loanRequests.map(async (request) => {
      if (!request.borrower?.id) return false
      return isInWatchlist(lenderProfileId, request.borrower.id)
    }),
  )

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {loanRequests.map((request, index) => {
        const isWatched = watchlistStatuses[index]

        return (
          <Card key={request.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{request.borrower?.full_name || "N/A"}</CardTitle>
                    {request.borrower?.badges && request.borrower.badges.length > 0 && (
                      <ReputationBadgesDisplay badges={request.borrower.badges} size="sm" maxDisplay={3} />
                    )}
                  </div>
                  <CardDescription>Requested on {new Date(request.requested_at).toLocaleDateString()}</CardDescription>
                </div>
                <Badge variant={getTrustScoreVariant(request.borrower?.trust_score)}>
                  Trust Score: {request.borrower?.trust_score || "N/A"}
                </Badge>
              </div>
              {request.borrower?.smart_tags && request.borrower.smart_tags.length > 0 && (
                <div className="mt-2">
                  <SmartTagsDisplay tags={request.borrower.smart_tags} size="sm" />
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: request.currency_code,
                }).format(request.loan_amount)}
              </p>
              <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                <span className="font-semibold">Purpose:</span> {request.purpose || "Not specified"}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2">
              {/* 2. Wrap the Button in a Link */}
              <Link href={`/lender/requests/${request.id}`} className="w-full">
                <Button className="w-full">View Details & Make Offer</Button>
              </Link>
              {request.borrower?.id && (
                <WatchlistButton
                  lenderProfileId={lenderProfileId}
                  borrowerProfileId={request.borrower.id}
                  countryId={request.country_id}
                  initialIsInWatchlist={isWatched}
                />
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

function getTrustScoreVariant(score: number | null | undefined): "default" | "secondary" | "destructive" {
  if (score === null || score === undefined) return "secondary"
  if (score > 70) return "default"
  if (score < 40) return "destructive"
  return "secondary"
}
