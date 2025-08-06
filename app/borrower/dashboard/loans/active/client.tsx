"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  CheckCircle,
  TrendingUp,
  Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ActiveLoansClientProps {
  loans: any[]
  stats: {
    totalActive: number
    totalOwed: number
    overdueCount: number
    nextPaymentAmount: number
    nextPaymentDate: string | null
  }
  profile: any
}

export function ActiveLoansClient({ loans, stats, profile }: ActiveLoansClientProps) {
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Pagination
  const totalPages = Math.ceil(loans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLoans = loans.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      case "defaulted":
        return <Badge variant="destructive">Defaulted</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const calculateRepaymentProgress = (loan: any) => {
    if (!loan.repayments || loan.repayments.length === 0) return 0
    const totalAmount = loan.amount * (1 + (loan.interest_rate || 0) / 100)
    const totalRepaid = loan.repayments.reduce((sum: number, payment: any) => 
      payment.status === "completed" ? sum + payment.amount : sum, 0
    )
    return Math.min((totalRepaid / totalAmount) * 100, 100)
  }

  const calculateRemainingAmount = (loan: any) => {
    const totalAmount = loan.amount * (1 + (loan.interest_rate || 0) / 100)
    const totalRepaid = loan.repayments?.reduce((sum: number, payment: any) => 
      payment.status === "completed" ? sum + payment.amount : sum, 0
    ) || 0
    return totalAmount - totalRepaid
  }

  const getDaysUntilDue = (date: string) => {
    const due = new Date(date)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Loans</h1>
        <p className="mt-2 text-gray-600">
          Manage your current loans and track repayment progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Current obligations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOwed)}</div>
            <p className="text-xs text-muted-foreground">Remaining balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.nextPaymentDate ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.nextPaymentAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Due {formatDate(stats.nextPaymentDate)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">No payments due</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : ''}`}>
              {stats.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueCount > 0 ? 'Require immediate attention' : 'All payments on track'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {stats.overdueCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">You have {stats.overdueCount} overdue loan{stats.overdueCount > 1 ? 's' : ''}</span>
                <p className="text-sm mt-1">
                  Make payments immediately to avoid negative impact on your credit score
                </p>
              </div>
              <Link href="/borrower/dashboard/loans/repayments">
                <Button size="sm" variant="destructive">
                  Make Payment Now
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Loans</CardTitle>
          <CardDescription>
            Click on a loan to view details and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedLoans.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lender</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Repayment Progress</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLoans.map((loan) => {
                    const progress = calculateRepaymentProgress(loan)
                    const remaining = calculateRemainingAmount(loan)
                    const daysUntilDue = getDaysUntilDue(loan.next_payment_date || loan.due_date)
                    
                    return (
                      <TableRow 
                        key={loan.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedLoan(loan)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-medium">
                              {loan.lender?.company_name?.charAt(0) || loan.lender?.full_name?.charAt(0) || "L"}
                            </div>
                            <div>
                              <p className="font-medium">
                                {loan.lender?.company_name || loan.lender?.full_name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-500">{loan.lender?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(loan.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(remaining)} remaining
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{loan.interest_rate}% p.a.</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-gray-500">{progress.toFixed(0)}% complete</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">
                                {formatCurrency(loan.monthly_payment || loan.amount / loan.duration_months)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {daysUntilDue > 0 
                                  ? `In ${daysUntilDue} days`
                                  : `${Math.abs(daysUntilDue)} days overdue`
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href="/borrower/dashboard/loans/repayments">
                              <Button size="sm" variant="outline">
                                Pay Now
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, loans.length)} of {loans.length} loans
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No active loans</h3>
              <p className="mt-2 text-sm text-gray-500">
                You don't have any active loans at the moment
              </p>
              <Link href="/borrower/dashboard/requests/new">
                <Button className="mt-4">Create Loan Request</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              Complete information about your loan
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Lender</p>
                  <p className="font-medium">
                    {selectedLoan.lender?.company_name || selectedLoan.lender?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="font-medium">{formatCurrency(selectedLoan.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Interest Rate</p>
                  <p className="font-medium">{selectedLoan.interest_rate}% per annum</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{selectedLoan.duration_months} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{formatDate(selectedLoan.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{formatDate(selectedLoan.due_date)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Repayment Progress</p>
                <Progress value={calculateRepaymentProgress(selectedLoan)} className="h-3" />
                <div className="flex justify-between mt-2 text-sm">
                  <span>
                    Paid: {formatCurrency(
                      selectedLoan.repayments?.reduce((sum: number, p: any) => 
                        p.status === "completed" ? sum + p.amount : sum, 0
                      ) || 0
                    )}
                  </span>
                  <span>
                    Remaining: {formatCurrency(calculateRemainingAmount(selectedLoan))}
                  </span>
                </div>
              </div>

              {selectedLoan.repayments && selectedLoan.repayments.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Recent Payments</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedLoan.repayments.slice(0, 5).map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{formatDate(payment.payment_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(payment.amount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method || "Bank"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Always maintain communication with your lender and make payments on time to maintain a good credit score.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            <Link href="/borrower/dashboard/loans/repayments">
              <Button>Make Payment</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}