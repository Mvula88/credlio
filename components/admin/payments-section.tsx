"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AlertCircle, Search, CheckCircle, XCircle, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PaymentReceiptDialog } from "@/components/payment-receipt-dialog"
import type { Database } from "@/lib/types/database"

export function PaymentsSection() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("loan_payments")
          .select(`
            *,
            loan_requests (
              id,
              loan_title,
              borrower_id,
              lender_id
            ),
            borrower:loan_requests(borrower:borrower_id(full_name, email)),
            lender:loan_requests(lender:lender_id(full_name, email))
          `)
          .order("due_date", { ascending: false })

        if (error) throw error
        setPayments(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [supabase])

  const filteredPayments = payments.filter(
    (payment) =>
      payment.loan_requests?.loan_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.borrower?.borrower?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.lender?.lender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleVerifyPayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("loan_payments")
        .update({
          status: "completed",
          verified_at: new Date().toISOString(),
          verified_by: "admin",
        })
        .eq("id", id)

      if (error) throw error

      // Update local state
      setPayments((prev) => prev.map((payment) => (payment.id === id ? { ...payment, status: "completed" } : payment)))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRejectPayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("loan_payments")
        .update({
          status: "rejected",
          verified_at: new Date().toISOString(),
          verified_by: "admin",
        })
        .eq("id", id)

      if (error) throw error

      // Update local state
      setPayments((prev) => prev.map((payment) => (payment.id === id ? { ...payment, status: "rejected" } : payment)))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "late":
        return <Badge variant="destructive">Late</Badge>
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Management</CardTitle>
          <CardDescription>Review and verify loan payments</CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.loan_requests?.loan_title || "Unknown Loan"}</TableCell>
                    <TableCell>{payment.borrower?.borrower?.full_name || "Unknown"}</TableCell>
                    <TableCell>{payment.lender?.lender?.full_name || "Unknown"}</TableCell>
                    <TableCell>${payment.amount?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment)
                            setReceiptDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        {payment.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              onClick={() => handleVerifyPayment(payment.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              onClick={() => handleRejectPayment(payment.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Receipt Dialog */}
      {selectedPayment && (
        <PaymentReceiptDialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen} payment={selectedPayment} />
      )}
    </>
  )
}

export { PaymentsSection as AdminPaymentsSection }
