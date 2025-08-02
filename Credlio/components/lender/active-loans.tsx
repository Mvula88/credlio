"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RecordPaymentForm } from "@/components/lender/record-payment-form"
import { DocumentChecklistDialog } from "@/components/lender/document-checklist"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, DollarSign, User, FileCheck } from "lucide-react"
import type { ActiveLoan } from "@/lib/types/reputation"

export function ActiveLoansSection({ lenderId }: { lenderId: string }) {
  const [loans, setLoans] = useState<ActiveLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showChecklistDialog, setShowChecklistDialog] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchLoans() {
      try {
        const { data, error } = await supabase
          .from("active_loans")
          .select(
            `
            *,
            borrower:profiles!active_loans_borrower_id_fkey(
              id,
              full_name,
              email
            )
          `
          )
          .eq("lender_id", lenderId)
          .in("status", ["active", "overdue"])
          .order("created_at", { ascending: false })

        if (error) throw error
        setLoans(data || [])
      } catch (error) {
        console.error("Error fetching active loans:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLoans()
  }, [lenderId, supabase])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string, repaymentDate: string) => {
    const isOverdue = new Date(repaymentDate) < new Date() && status === "active"

    if (status === "overdue" || isOverdue) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>
  }

  const getDaysUntilDue = (repaymentDate: string) => {
    const days = Math.ceil(
      (new Date(repaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return "Due today"
    return `${days} days remaining`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
          <CardDescription>Track and manage your current loans</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading active loans...</div>
          ) : loans.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active loans at the moment
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {loan.borrower?.full_name || "Unknown Borrower"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{loan.borrower?.email}</p>
                      </div>
                      {getStatusBadge(loan.status, loan.repayment_date)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Principal</p>
                        <p className="font-semibold">{formatCurrency(loan.principal_amount)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total Due</p>
                        <p className="font-semibold">{formatCurrency(loan.total_amount)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="font-semibold">
                          {new Date(loan.repayment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-semibold">
                          {getDaysUntilDue(loan.repayment_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLoan(loan)
                          setShowPaymentDialog(true)
                        }}
                      >
                        Record Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLoan(loan)
                          setShowChecklistDialog(true)
                        }}
                      >
                        <FileCheck className="mr-1 h-4 w-4" />
                        Documents
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <RecordPaymentForm
              loan={selectedLoan}
              onSuccess={() => {
                setShowPaymentDialog(false)
                setSelectedLoan(null)
                // Refresh loans
                window.location.reload()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Document Checklist Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Verification Checklist</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <DocumentChecklistDialog
              loanId={selectedLoan.id}
              loanOfferId={selectedLoan.loan_offer_id}
              lenderId={lenderId}
              borrowerId={selectedLoan.borrower_id}
              onClose={() => {
                setShowChecklistDialog(false)
                setSelectedLoan(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
