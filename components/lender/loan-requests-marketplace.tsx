"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BorrowerReputationCard } from "@/components/borrower/reputation-card"
import { MakeOfferForm } from "@/components/lender/simple-make-offer-form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DollarSign, Calendar, TrendingUp, User, FileCheck } from "lucide-react"
import type { LoanRequest } from "@/lib/types/reputation"
import { VerificationBadge } from "@/components/lender/verification-badge"

export function LoanRequestsMarketplace({ lenderId }: { lenderId: string }) {
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchRequests() {
      try {
        const { data, error } = await supabase
          .from("loan_requests")
          .select(
            `
            *,
            borrower:profiles!loan_requests_borrower_id_fkey(
              id,
              full_name,
              email
            )
          `
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })

        if (error) throw error
        setRequests(data || [])
      } catch (error) {
        console.error("Error fetching loan requests:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Loan Requests Marketplace</CardTitle>
          <CardDescription>Browse active loan requests from verified borrowers</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading loan requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active loan requests at the moment
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid gap-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">{request.purpose}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{request.borrower?.full_name || "Unknown"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <VerificationBadge
                          borrowerId={request.borrower_id}
                          loanRequestId={request.id}
                          verificationStatus={{
                            total: 5,
                            verified: 0,
                            failed: 0,
                            pending: 5
                          }}
                          compact
                        />
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-gray-600">
                      {request.description || "No additional details provided"}
                    </p>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Amount
                        </p>
                        <p className="font-semibold">{formatCurrency(request.amount)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Period
                        </p>
                        <p className="font-semibold">{request.repayment_period} days</p>
                      </div>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          Suggested Rate
                        </p>
                        <p className="font-semibold">{request.interest_rate || "Open"}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Posted</p>
                        <p className="font-semibold">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/lender/verify/${request.id}`}
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowOfferDialog(true)
                        }}
                      >
                        Make Offer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Borrower Profile Dialog */}
      <Dialog
        open={!!selectedRequest && !showOfferDialog}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Borrower Reputation Profile</DialogTitle>
          </DialogHeader>
          {selectedRequest && <BorrowerReputationCard borrowerId={selectedRequest.borrower_id} />}
        </DialogContent>
      </Dialog>

      {/* Make Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make a Loan Offer</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <MakeOfferForm
              loanRequest={selectedRequest}
              lenderId={lenderId}
              onSuccess={() => {
                setShowOfferDialog(false)
                setSelectedRequest(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
