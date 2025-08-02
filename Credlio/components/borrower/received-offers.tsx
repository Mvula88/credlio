"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  DollarSign,
  Calendar,
  Percent,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import type { LoanOffer } from "@/lib/types/bureau"

interface ReceivedOffersProps {
  borrowerId: string
}

export function ReceivedOffers({ borrowerId }: ReceivedOffersProps) {
  const [offers, setOffers] = useState<LoanOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [processing, setProcessing] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchOffers()

    // Set up real-time subscription
    const subscription = supabase
      .channel("loan-offers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loan_offers",
          filter: `borrower_id=eq.${borrowerId}`,
        },
        () => {
          fetchOffers()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [borrowerId])

  async function fetchOffers() {
    try {
      const { data } = await supabase
        .from("loan_offers")
        .select(
          `
          *,
          lender:profiles!lender_id(
            id,
            full_name,
            email
          ),
          loan_request:loan_requests(
            id,
            amount,
            purpose,
            repayment_period
          )
        `
        )
        .eq("borrower_id", borrowerId)
        .order("created_at", { ascending: false })

      setOffers(data || [])
    } catch (error) {
      console.error("Error fetching offers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptOffer() {
    if (!selectedOffer) return

    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc("accept_loan_offer", {
        p_offer_id: selectedOffer.id,
      })

      if (error) throw error

      if (data?.success) {
        await fetchOffers()
        setShowAcceptDialog(false)
        setSelectedOffer(null)
        alert("Offer accepted successfully! The loan has been activated.")
      } else {
        alert(data?.error || "Failed to accept offer")
      }
    } catch (error) {
      console.error("Error accepting offer:", error)
      alert("Failed to accept offer")
    } finally {
      setProcessing(false)
    }
  }

  async function handleRejectOffer(offerId: string) {
    try {
      const { error } = await supabase
        .from("loan_offers")
        .update({ status: "rejected" })
        .eq("id", offerId)

      if (error) throw error
      await fetchOffers()
    } catch (error) {
      console.error("Error rejecting offer:", error)
    }
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

  const getStatusBadge = (status: string) => {
    const config = {
      pending: {
        label: "Pending",
        color: "bg-blue-100 text-blue-800",
        icon: <Clock className="h-3 w-3" />,
      },
      accepted: {
        label: "Accepted",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-3 w-3" />,
      },
      rejected: {
        label: "Rejected",
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="h-3 w-3" />,
      },
      withdrawn: {
        label: "Withdrawn",
        color: "bg-gray-100 text-gray-800",
        icon: <XCircle className="h-3 w-3" />,
      },
      expired: {
        label: "Expired",
        color: "bg-gray-100 text-gray-800",
        icon: <Clock className="h-3 w-3" />,
      },
    }

    const { label, color, icon } = config[status as keyof typeof config] || config.pending

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const calculateTotalRepayment = (amount: number, interestRate: number) => {
    return amount * (1 + interestRate / 100)
  }

  const calculateMonthlyPayment = (amount: number, interestRate: number, days: number) => {
    const total = calculateTotalRepayment(amount, interestRate)
    const months = days / 30
    return total / months
  }

  const pendingOffers = offers.filter((o) => o.status === "pending")
  const otherOffers = offers.filter((o) => o.status !== "pending")

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
          <CardTitle>Received Offers</CardTitle>
          <CardDescription>Review and respond to loan offers from lenders</CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <Alert>
              <AlertDescription>You haven't received any loan offers yet</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Pending Offers */}
              {pendingOffers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Pending Offers ({pendingOffers.length})
                  </h3>
                  {pendingOffers.map((offer) => (
                    <Card key={offer.id} className="border-blue-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Offer from {offer.lender?.full_name || "Unknown"}
                            </CardTitle>
                            <CardDescription>
                              For: {offer.loan_request?.purpose} request
                            </CardDescription>
                          </div>
                          {getStatusBadge(offer.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount Offered</p>
                            <p className="flex items-center gap-1 font-medium">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(offer.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Interest Rate</p>
                            <p className="flex items-center gap-1 font-medium">
                              <Percent className="h-3 w-3" />
                              {offer.interest_rate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Repayment Period</p>
                            <p className="flex items-center gap-1 font-medium">
                              <Calendar className="h-3 w-3" />
                              {offer.repayment_period} days
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="font-medium">{formatDate(offer.expires_at)}</p>
                          </div>
                        </div>

                        {offer.terms && (
                          <div className="rounded-md bg-gray-50 p-3">
                            <p className="mb-1 text-sm font-medium">Additional Terms:</p>
                            <p className="text-sm text-gray-700">{offer.terms}</p>
                          </div>
                        )}

                        <Alert>
                          <DollarSign className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Total Repayment:</strong>{" "}
                            {formatCurrency(
                              calculateTotalRepayment(offer.amount, offer.interest_rate)
                            )}
                            <br />
                            <strong>Estimated Monthly Payment:</strong>{" "}
                            {formatCurrency(
                              calculateMonthlyPayment(
                                offer.amount,
                                offer.interest_rate,
                                offer.repayment_period
                              )
                            )}
                          </AlertDescription>
                        </Alert>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedOffer(offer)
                              setShowAcceptDialog(true)
                            }}
                            className="flex-1"
                          >
                            Accept Offer
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleRejectOffer(offer.id)}
                            className="flex-1"
                          >
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Other Offers */}
              {otherOffers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Other Offers ({otherOffers.length})
                  </h3>
                  {otherOffers.map((offer) => (
                    <Card key={offer.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {offer.lender?.full_name || "Unknown"}
                            </CardTitle>
                            <CardDescription>
                              {formatCurrency(offer.amount)} at {offer.interest_rate}%
                            </CardDescription>
                          </div>
                          {getStatusBadge(offer.status)}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once you accept an offer, all other pending offers for the
              same request will be automatically rejected. Make sure to review all terms carefully
              before accepting.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Accept Offer Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Loan Offer</DialogTitle>
            <DialogDescription>Are you sure you want to accept this loan offer?</DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  By accepting this offer, you agree to:
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>
                      Repay{" "}
                      {formatCurrency(
                        calculateTotalRepayment(selectedOffer.amount, selectedOffer.interest_rate)
                      )}{" "}
                      over {selectedOffer.repayment_period} days
                    </li>
                    <li>Make timely payments to maintain your reputation score</li>
                    <li>Contact the lender if you face any payment difficulties</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lender</span>
                  <span className="font-medium">{selectedOffer.lender?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loan Amount</span>
                  <span className="font-medium">{formatCurrency(selectedOffer.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total to Repay</span>
                  <span className="font-medium">
                    {formatCurrency(
                      calculateTotalRepayment(selectedOffer.amount, selectedOffer.interest_rate)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAcceptOffer} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Accept Offer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
