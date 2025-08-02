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
import { PaymentConfirmationForm } from "@/components/lender/payment-confirmation-form"
import { CheckCircle, Clock, FileText } from "lucide-react"
import type { LoanPayment } from "@/lib/types"

interface PaymentsSectionProps {
  pendingPayments: LoanPayment[]
  scheduledPayments: LoanPayment[]
  completedPayments: LoanPayment[]
  lenderProfileId: string
}

export function PaymentsSection({
  pendingPayments,
  scheduledPayments,
  completedPayments,
  lenderProfileId,
}: PaymentsSectionProps) {
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleViewDetails = (payment: LoanPayment) => {
    setSelectedPayment(payment)
    setIsDialogOpen(true)
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loan Payments</CardTitle>
          <CardDescription>Manage and track payments from your borrowers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pending Confirmation</CardTitle>
                <CardDescription>Payments awaiting your confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingPayments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Scheduled</CardTitle>
                <CardDescription>Upcoming payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{scheduledPayments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Completed</CardTitle>
                <CardDescription>Confirmed payments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{completedPayments.length}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Confirmation ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({scheduledPayments.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedPayments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
              {pendingPayments.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No payments pending confirmation</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-yellow-100 p-2">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: payment.currency_code,
                            }).format(payment.amount_due)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Initiated on {new Date(payment.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">Pending Confirmation</Badge>
                        <Button size="sm" onClick={() => handleViewDetails(payment)}>
                          Confirm
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="scheduled">
              {scheduledPayments.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No scheduled payments</p>
              ) : (
                <div className="space-y-3">
                  {scheduledPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2">
                          <Clock className="h-5 w-5 text-blue-600" />
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
                        <Badge variant="secondary">Scheduled</Badge>
                        <Button
                          size="sm"
                          variant="outline"
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
            <TabsContent value="completed">
              {completedPayments.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No completed payments</p>
              ) : (
                <div className="space-y-3">
                  {completedPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: payment.currency_code,
                            }).format(payment.amount_due)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Paid on{" "}
                            {new Date(
                              payment.payment_date || payment.updated_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="default">Completed</Badge>
                        <Button
                          size="sm"
                          variant="outline"
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

                  <h3 className="mb-2 mt-6 font-medium">Borrower Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Borrower ID</p>
                      <p className="font-medium">{selectedPayment.borrower_profile_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Loan ID</p>
                      <p className="font-medium">{selectedPayment.loan_request_id}</p>
                    </div>
                  </div>
                </div>

                <div>
                  {selectedPayment.payment_status === "pending_confirmation" && (
                    <PaymentConfirmationForm
                      payment={selectedPayment}
                      lenderProfileId={lenderProfileId}
                    />
                  )}

                  {selectedPayment.payment_status === "scheduled" && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Scheduled Payment</CardTitle>
                        <CardDescription>
                          This payment is scheduled but not yet initiated by the borrower.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          The borrower will need to make this payment directly to you and then
                          record it on the platform. You'll be notified when they do.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPayment.payment_status === "completed" && (
                    <Card className="bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">Payment Completed</CardTitle>
                        <CardDescription className="text-green-700">
                          This payment has been confirmed.
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
                        <Button variant="outline" className="mt-4">
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
                          This payment was marked as failed.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-red-700">
                          Reason: {selectedPayment.notes || "Not specified"}
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
