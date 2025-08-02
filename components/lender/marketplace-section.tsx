"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingBag,
  DollarSign,
  Calendar,
  User,
  TrendingUp,
  Clock,
  Send,
  Loader2,
  Filter,
  AlertTriangle,
} from "lucide-react"
import type { LoanRequest, LoanOffer, BorrowerReputation } from "@/lib/types/bureau"

interface MarketplaceSectionProps {
  lenderId: string
}

export function MarketplaceSection({ lenderId }: MarketplaceSectionProps) {
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [myOffers, setMyOffers] = useState<LoanOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null)
  const [borrowerReputation, setBorrowerReputation] = useState<BorrowerReputation | null>(null)
  const [showOfferDialog, setShowOfferDialog] = useState(false)
  const [submittingOffer, setSubmittingOffer] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [offerData, setOfferData] = useState({
    amount: 0,
    interest_rate: 0,
    repayment_period: 0,
    terms: "",
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
  }, [lenderId])

  async function fetchData() {
    try {
      // Fetch active loan requests
      const { data: requests } = await supabase
        .from("loan_requests")
        .select(
          `
          *,
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })

      // For each request, get borrower reputation
      if (requests) {
        const requestsWithReputation = await Promise.all(
          requests.map(async (request) => {
            const { data: reputation } = await supabase
              .from("borrower_reputation")
              .select("reputation_score, reputation_category, is_blacklisted")
              .eq("borrower_id", request.borrower_id)
              .single()

            return { ...request, reputation }
          })
        )

        setLoanRequests(requestsWithReputation)
      }

      // Fetch my offers
      const { data: offers } = await supabase
        .from("loan_offers")
        .select(
          `
          *,
          loan_request:loan_requests(*),
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("lender_id", lenderId)
        .order("created_at", { ascending: false })

      setMyOffers(offers || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBorrowerReputation(borrowerId: string) {
    try {
      const { data } = await supabase
        .from("borrower_reputation")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      setBorrowerReputation(data)
    } catch (error) {
      console.error("Error fetching reputation:", error)
    }
  }

  async function handleMakeOffer() {
    if (!selectedRequest) return

    setSubmittingOffer(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3) // 3 days expiry

      const { error } = await supabase.from("loan_offers").insert({
        loan_request_id: selectedRequest.id,
        lender_id: lenderId,
        borrower_id: selectedRequest.borrower_id,
        amount: offerData.amount,
        interest_rate: offerData.interest_rate,
        repayment_period: offerData.repayment_period,
        terms: offerData.terms,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      await fetchData()
      setShowOfferDialog(false)
      resetOfferForm()
    } catch (error) {
      console.error("Error making offer:", error)
      alert("Failed to submit offer")
    } finally {
      setSubmittingOffer(false)
    }
  }

  function resetOfferForm() {
    setOfferData({
      amount: 0,
      interest_rate: 0,
      repayment_period: 0,
      terms: "",
    })
    setSelectedRequest(null)
    setBorrowerReputation(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getScoreBadge = (score: number, category: string) => {
    const colors = {
      GOOD: "bg-green-100 text-green-800",
      MODERATE: "bg-yellow-100 text-yellow-800",
      BAD: "bg-red-100 text-red-800",
    }

    return <Badge className={colors[category as keyof typeof colors]}>Score: {score}/100</Badge>
  }

  const getOfferStatusBadge = (status: string) => {
    const config = {
      pending: { label: "Pending", color: "bg-blue-100 text-blue-800" },
      accepted: { label: "Accepted", color: "bg-green-100 text-green-800" },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
      withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-800" },
      expired: { label: "Expired", color: "bg-gray-100 text-gray-800" },
    }

    const { label, color } = config[status as keyof typeof config] || config.pending
    return <Badge className={color}>{label}</Badge>
  }

  const filteredRequests = loanRequests.filter(
    (request) =>
      !request.reputation?.is_blacklisted &&
      (request.reputation?.reputation_score || 0) >= filterMinScore
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Loan Marketplace
                <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
              </CardTitle>
              <CardDescription>Browse loan requests and make competitive offers</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Label className="text-sm">Min Score:</Label>
              <Input
                type="number"
                className="w-20"
                value={filterMinScore}
                onChange={(e) => setFilterMinScore(parseInt(e.target.value) || 0)}
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="requests" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">
                Available Requests ({filteredRequests.length})
              </TabsTrigger>
              <TabsTrigger value="my-offers">My Offers ({myOffers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              {filteredRequests.length === 0 ? (
                <Alert>
                  <AlertDescription>No loan requests match your criteria</AlertDescription>
                </Alert>
              ) : (
                filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {request.borrower?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-600">{request.borrower?.email}</p>
                          </div>
                          {request.reputation &&
                            getScoreBadge(
                              request.reputation.reputation_score,
                              request.reputation.reputation_category
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <p className="text-muted-foreground">Amount Needed</p>
                            <p className="font-medium">{formatCurrency(request.amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Purpose</p>
                            <p className="font-medium">{request.purpose}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Repayment Period</p>
                            <p className="font-medium">{request.repayment_period} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Posted</p>
                            <p className="font-medium">{formatDate(request.created_at)}</p>
                          </div>
                        </div>

                        {request.description && (
                          <p className="text-sm text-gray-700">{request.description}</p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setOfferData({
                            amount: request.amount,
                            interest_rate: request.interest_rate || 10,
                            repayment_period: request.repayment_period,
                            terms: "",
                          })
                          fetchBorrowerReputation(request.borrower_id)
                          setShowOfferDialog(true)
                        }}
                      >
                        <Send className="mr-1 h-4 w-4" />
                        Make Offer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="my-offers" className="space-y-4">
              {myOffers.length === 0 ? (
                <Alert>
                  <AlertDescription>You haven't made any loan offers yet</AlertDescription>
                </Alert>
              ) : (
                myOffers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{offer.borrower?.full_name || "Unknown"}</p>
                          {getOfferStatusBadge(offer.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <p className="text-muted-foreground">Offered Amount</p>
                            <p className="font-medium">{formatCurrency(offer.amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Interest Rate</p>
                            <p className="font-medium">{offer.interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Period</p>
                            <p className="font-medium">{offer.repayment_period} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Offered On</p>
                            <p className="font-medium">{formatDate(offer.created_at)}</p>
                          </div>
                        </div>

                        {offer.terms && (
                          <p className="text-sm text-gray-700">Terms: {offer.terms}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          <Alert className="mt-4">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Smart Matching:</strong> Loan requests are matched based on borrower
              reputation scores. Only verified borrowers with good standing can post requests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Make Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Make Loan Offer</DialogTitle>
            <DialogDescription>Submit a competitive offer for this loan request</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Borrower Info */}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium">{selectedRequest.borrower?.full_name}</p>
                <p className="text-sm text-gray-600">{selectedRequest.borrower?.email}</p>
                {borrowerReputation && (
                  <div className="mt-2">
                    <Badge
                      className={
                        borrowerReputation.reputation_category === "GOOD"
                          ? "bg-green-100 text-green-800"
                          : borrowerReputation.reputation_category === "MODERATE"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {borrowerReputation.reputation_category} - Score:{" "}
                      {borrowerReputation.reputation_score}/100
                    </Badge>
                  </div>
                )}
              </div>

              {/* Offer Details */}
              <div>
                <Label>Loan Amount</Label>
                <Input
                  type="number"
                  value={offerData.amount}
                  onChange={(e) =>
                    setOfferData({ ...offerData, amount: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Requested: {formatCurrency(selectedRequest.amount)}
                </p>
              </div>

              <div>
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={offerData.interest_rate}
                  onChange={(e) =>
                    setOfferData({ ...offerData, interest_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <Label>Repayment Period (days)</Label>
                <Input
                  type="number"
                  value={offerData.repayment_period}
                  onChange={(e) =>
                    setOfferData({ ...offerData, repayment_period: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <Label>Additional Terms (optional)</Label>
                <textarea
                  className="w-full rounded-md border px-3 py-2"
                  rows={3}
                  placeholder="Any additional terms or conditions..."
                  value={offerData.terms}
                  onChange={(e) => setOfferData({ ...offerData, terms: e.target.value })}
                />
              </div>

              {/* Total Repayment */}
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Total Repayment:{" "}
                  {formatCurrency(offerData.amount * (1 + offerData.interest_rate / 100))}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMakeOffer}
              disabled={!offerData.amount || !offerData.interest_rate || submittingOffer}
            >
              {submittingOffer ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
