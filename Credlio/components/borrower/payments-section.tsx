"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PaymentRecordForm } from "@/components/borrower/payment-record-form"
import { CalendarIcon, FileText } from "lucide-react"
import { PaymentReceiptDialog } from "@/components/payment-receipt-dialog"
import type { LoanPayment } from "@/lib/types"

interface PaymentsSectionProps {
  upcomingPayments: LoanPayment[]
  paymentHistory: LoanPayment[]
  borrowerProfileId: string
}

export function PaymentsSection({
  upcomingPayments,
  paymentHistory,
  borrowerProfileId,
}: PaymentsSectionProps) {
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // Calculate payment statistics
  const totalScheduled = upcomingPayments.filter((p) => p.payment_status === "scheduled").length
  const totalPending = upcomingPayments.filter(
    (p) => p.payment_status === "pending_confirmation"
  ).length
  const totalCompleted = paymentHistory.filter((p) => p.payment_status === "completed").length
  const totalFailed = paymentHistory.filter((p) => p.payment_status === "failed").length

  const handleViewDetails = (payment: LoanPayment) => {
    setSelectedPayment(payment)
    setIsDialogOpen(true)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loan Payments</CardTitle>
          <CardDescription>Manage and track your loan payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Scheduled</CardTitle>
                <CardDescription>Upcoming payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalScheduled}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pending</CardTitle>
                <CardDescription>Awaiting confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalPending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Completed</CardTitle>
                <CardDescription>Confirmed payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalCompleted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Failed</CardTitle>
                <CardDescription>Unconfirmed payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalFailed}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {upcomingPayments.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No upcoming payments</p>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            payment.payment_status === "scheduled"
                              ? "bg-blue-100"
                              : payment.payment_status === "pending_confirmation"
                                ? "bg-yellow-100"
                                : "bg-gray-100"
                          }`}
                        >
                          <CalendarIcon
                            className={`h-5 w-5 ${
                              payment.payment_status === "scheduled"
                                ? "text-blue-600"
                                : payment.payment_status === "pending_confirmation"
                                  ? "text-yellow-600"
                                  : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: payment.currency_code,
                            }).format(payment.amount_due)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Due on {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <PaymentStatusBadge status={payment.payment_status} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(payment)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="history">
              {paymentHistory.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No payment history</p>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            payment.payment_status === "completed"
                              ? "bg-green-100"
                              : payment.payment_status === "failed"
                                ? "bg-red-100"
                                : "bg-gray-100"
                          }`}
                        >
                          <FileText
                            className={`h-5 w-5 ${
                              payment.payment_status === "completed"
                                ? "text-green-600"
                                : payment.payment_status === "failed"
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: payment.currency_code,
                            }).format(payment.amount_due)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.payment_date
                              ? `Paid on ${new Date(payment.payment_date).toLocaleDateString()}`
                              : `Due on ${new Date(payment.due_date).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <PaymentStatusBadge status={payment.payment_status} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(payment)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Payment Details</span>
                  <PaymentStatusBadge status={selectedPayment.payment_status} />
                </DialogTitle>
                <DialogDescription>
                  Due on {new Date(selectedPayment.due_date).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-medium">Payment Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Amount Due</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: selectedPayment.currency_code,
                        }).format(selectedPayment.amount_due)}
                      </p>
                    </div>
                    {selectedPayment.payment_method && (
                      <div>
                        <p className="text-sm text-gray-500">Payment Method</p>
                        <p className="font-medium capitalize">
                          {selectedPayment.payment_method.replace(/_/g, " ")}
                        </p>
                      </div>
                    )}
                    {selectedPayment.transaction_reference && (
                      <div>
                        <p className="text-sm text-gray-500">Reference Number</p>
                        <p className="font-medium">{selectedPayment.transaction_reference}</p>
                      </div>
                    )}
                    {selectedPayment.payment_date && (
                      <div>
                        <p className="text-sm text-gray-500">Payment Date</p>
                        <p className="font-medium">
                          {new Date(selectedPayment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedPayment.notes && (
                      <div>
                        <p className="text-sm text-gray-500">Notes</p>
                        <p className="font-medium">{selectedPayment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {selectedPayment.payment_status === "scheduled" && (
                    <PaymentRecordForm
                      payment={selectedPayment}
                      borrowerProfileId={borrowerProfileId}
                    />
                  )}

                  {selectedPayment.payment_status === "pending_confirmation" && (
                    <Card className="bg-yellow-50">
                      <CardHeader>
                        <CardTitle className="text-yellow-800">Payment Pending</CardTitle>
                        <CardDescription className="text-yellow-700">
                          Your payment is awaiting confirmation from the lender.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-yellow-700">
                          You recorded this payment on{" "}
                          {new Date(selectedPayment.updated_at).toLocaleDateString()}. The lender
                          will review and confirm receipt of your payment.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPayment.payment_status === "completed" && (
                    <Card className="bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">Payment Completed</CardTitle>
                        <CardDescription className="text-green-700">
                          This payment has been confirmed by the lender.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-green-700">
                          Payment was confirmed on{" "}
                          {new Date(
                            selectedPayment.payment_date || selectedPayment.updated_at
                          ).toLocaleDateString()}
                          .
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setIsReceiptOpen(true)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Receipt
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPayment.payment_status === "failed" && (
                    <Card className="bg-red-50">
                      <CardHeader>
                        <CardTitle className="text-red-800">Payment Failed</CardTitle>
                        <CardDescription className="text-red-700">
                          The lender could not confirm receipt of this payment.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-700">
                          Reason: {selectedPayment.notes || "Not specified"}
                        </p>
                        <p className="mt-2 text-sm text-red-700">
                          Please contact the lender directly to resolve this issue, then record a
                          new payment.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <PaymentReceiptDialog
        payment={selectedPayment}
        isOpen={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
      />
    </>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"

  switch (status) {
    case "completed":
      variant = "default"
      break
    case "scheduled":
    case "pending_confirmation":
      variant = "secondary"
      break
    case "failed":
    case "overdue":
      variant = "destructive"
      break
  }

  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>
}
