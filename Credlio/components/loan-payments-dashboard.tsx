"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, FileText, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

interface UserRole {
  isSuperAdmin: boolean
  isCountryAdmin: boolean
  isLender: boolean
  isBorrower: boolean
}

interface LoanPaymentsDashboardProps {
  userRole: UserRole
  profileId: string
}

interface LoanPayment {
  id: string
  loan_request_id: string
  borrower_profile_id: string
  lender_profile_id: string
  amount_due: number
  currency_code: string
  due_date: string
  amount_paid?: number | null
  payment_date?: string | null
  payment_status:
    | "scheduled"
    | "pending_confirmation"
    | "completed"
    | "failed"
    | "overdue"
    | "reversed"
  payment_method?: string | null
  transaction_reference?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

interface LoanRequest {
  id: string
  borrower_profile_id: string
  lender_profile_id: string
  loan_amount: number
  status: string
  purpose: string | null
}

export default function LoanPaymentsDashboard({ userRole, profileId }: LoanPaymentsDashboardProps) {
  const [payments, setPayments] = useState<LoanPayment[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch loan payments - RLS will automatically filter based on user role
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("loan_payments")
          .select("*")
          .order("due_date", { ascending: false })

        if (paymentsError) throw paymentsError

        // Fetch loan requests for context - RLS will automatically filter
        const { data: requestsData, error: requestsError } = await supabase
          .from("loan_requests")
          .select("id, borrower_profile_id, lender_profile_id, loan_amount, status, purpose")

        if (requestsError) throw requestsError

        setPayments(paymentsData || [])
        setLoanRequests(requestsData || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load payment data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, profileId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending_confirmation":
        return "bg-yellow-100 text-yellow-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "overdue":
        return "bg-orange-100 text-orange-800"
      case "reversed":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="mr-1 h-4 w-4" />
      case "pending_confirmation":
        return <Clock className="mr-1 h-4 w-4" />
      case "scheduled":
        return <Clock className="mr-1 h-4 w-4" />
      case "failed":
        return <XCircle className="mr-1 h-4 w-4" />
      case "overdue":
        return <AlertCircle className="mr-1 h-4 w-4" />
      case "reversed":
        return <AlertCircle className="mr-1 h-4 w-4" />
      default:
        return null
    }
  }

  const getLoanPurpose = (loanRequestId: string) => {
    const loan = loanRequests.find((lr) => lr.id === loanRequestId)
    return loan?.purpose || "General"
  }

  const formatCurrency = (amount: number, currencyCode = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDetailPageUrl = (paymentId: string) => {
    if (userRole.isBorrower) {
      return `/borrower/payments/${paymentId}`
    } else if (userRole.isLender) {
      return `/lender/payments/${paymentId}`
    } else {
      return `/admin/payments/${paymentId}`
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Loan Payments</CardTitle>
        <CardDescription>
          {userRole.isSuperAdmin && "View all payments across the platform"}
          {userRole.isCountryAdmin && "View all payments in your country"}
          {userRole.isLender && "View payments for loans you have funded"}
          {userRole.isBorrower && "View your loan payment history"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">Loading payments...</div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-500">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payment records found</div>
        ) : (
          <>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Information</AlertTitle>
              <AlertDescription>
                Payments are made directly between borrowers and lenders outside the platform. This
                dashboard is for recording and tracking payment status only.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Payments</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="pending">Pending Confirmation</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <PaymentsTable
                  payments={payments}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLoanPurpose={getLoanPurpose}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getDetailPageUrl={getDetailPageUrl}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="scheduled">
                <PaymentsTable
                  payments={payments.filter((p) => p.payment_status === "scheduled")}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLoanPurpose={getLoanPurpose}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getDetailPageUrl={getDetailPageUrl}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="pending">
                <PaymentsTable
                  payments={payments.filter((p) => p.payment_status === "pending_confirmation")}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLoanPurpose={getLoanPurpose}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getDetailPageUrl={getDetailPageUrl}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="completed">
                <PaymentsTable
                  payments={payments.filter((p) => p.payment_status === "completed")}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLoanPurpose={getLoanPurpose}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getDetailPageUrl={getDetailPageUrl}
                  userRole={userRole}
                />
              </TabsContent>

              <TabsContent value="overdue">
                <PaymentsTable
                  payments={payments.filter((p) => p.payment_status === "overdue")}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLoanPurpose={getLoanPurpose}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getDetailPageUrl={getDetailPageUrl}
                  userRole={userRole}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentsTable({
  payments,
  getStatusColor,
  getStatusIcon,
  getLoanPurpose,
  formatCurrency,
  formatDate,
  getDetailPageUrl,
  userRole,
}: {
  payments: LoanPayment[]
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  getLoanPurpose: (loanRequestId: string) => string
  formatCurrency: (amount: number, currencyCode?: string) => string
  formatDate: (dateString: string) => string
  getDetailPageUrl: (paymentId: string) => string
  userRole: UserRole
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Due Date</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Amount Due</TableHead>
            <TableHead>Status</TableHead>
            {payments.some((p) => p.payment_date) && <TableHead>Payment Date</TableHead>}
            {payments.some((p) => p.payment_method) && <TableHead>Method</TableHead>}
            {payments.some((p) => p.transaction_reference) && <TableHead>Reference</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.due_date)}</TableCell>
              <TableCell>{getLoanPurpose(payment.loan_request_id)}</TableCell>
              <TableCell>{formatCurrency(payment.amount_due, payment.currency_code)}</TableCell>
              <TableCell>
                <Badge className={`flex items-center ${getStatusColor(payment.payment_status)}`}>
                  {getStatusIcon(payment.payment_status)}
                  {payment.payment_status.replace("_", " ")}
                </Badge>
              </TableCell>
              {payments.some((p) => p.payment_date) && (
                <TableCell>
                  {payment.payment_date ? formatDate(payment.payment_date) : "-"}
                </TableCell>
              )}
              {payments.some((p) => p.payment_method) && (
                <TableCell>{payment.payment_method || "-"}</TableCell>
              )}
              {payments.some((p) => p.transaction_reference) && (
                <TableCell>{payment.transaction_reference || "-"}</TableCell>
              )}
              <TableCell>
                <Link href={getDetailPageUrl(payment.id)}>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <FileText className="mr-1 h-4 w-4" />
                    Details
                  </Button>
                </Link>
                {payment.payment_status === "completed" && (
                  <Link href={`${getDetailPageUrl(payment.id)}/receipt`}>
                    <Button variant="ghost" size="sm" className="ml-2 flex items-center">
                      <FileText className="mr-1 h-4 w-4" />
                      Receipt
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
