"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, DollarSign, User, X } from "lucide-react"
import type { LoanOffer } from "@/lib/types/reputation"

export function MyOffersSection({ lenderId }: { lenderId: string }) {
  const [offers, setOffers] = useState<LoanOffer[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchOffers()
  }, [lenderId])

  async function fetchOffers() {
    try {
      const { data, error } = await supabase
        .from("loan_offers")
        .select(
          `
          *,
          borrower:profiles!loan_offers_borrower_id_fkey(
            id,
            full_name,
            email
          ),
          loan_request:loan_requests!loan_offers_loan_request_id_fkey(
            purpose,
            description
          )
        `
        )
        .eq("lender_id", lenderId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setOffers(data || [])
    } catch (error) {
      console.error("Error fetching offers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function withdrawOffer(offerId: string) {
    try {
      const { error } = await supabase
        .from("loan_offers")
        .update({ status: "withdrawn" })
        .eq("id", offerId)
        .eq("lender_id", lenderId)

      if (error) throw error

      // Refresh offers
      fetchOffers()
    } catch (error) {
      console.error("Error withdrawing offer:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      withdrawn: "bg-gray-100 text-gray-800",
      expired: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Offers</CardTitle>
        <CardDescription>Track all loan offers you've made</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            You haven't made any offers yet
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {offers.map((offer) => (
                <div key={offer.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{offer.loan_request?.purpose || "Loan Request"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{offer.borrower?.full_name || "Unknown"}</span>
                      </div>
                    </div>
                    {getStatusBadge(offer.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-semibold">{formatCurrency(offer.amount)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{offer.interest_rate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Period</p>
                      <p className="font-semibold">{offer.repayment_period} days</p>
                    </div>
                  </div>

                  {offer.terms && <p className="text-sm text-gray-600">Terms: {offer.terms}</p>}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(offer.created_at).toLocaleDateString()}</span>
                    </div>

                    {offer.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => withdrawOffer(offer.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
