import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect, notFound } from "next/navigation"
import { getLoanRequestById } from "@/lib/data/loans"
import { getLoanPayments } from "@/lib/data/payments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function BorrowerLoanDetailPage({ params }: { params: { loanId: string } }) {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, user_profile_roles(user_roles(role_name))")
    .eq("auth_user_id", session.user.id)
    .single()

  if (!profile) {
    redirect("/onboarding")
  }

  const isBorrower = profile.user_profile_roles.some((roleEntry: any) => roleEntry.user_roles.role_name === "borrower")

  if (!isBorrower) {
    redirect("/")
    return null
  }

  // Get the loan request
  const loanRequest = await getLoanRequestById(params.loanId)

  if (!loanRequest || loanRequest.borrower_profile_id !== profile.id) {
    notFound()
  }

  // Get the payment schedule for this loan
  const payments = await getLoanPayments(loanRequest.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/borrower/dashboard" className="flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Link>

      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600">{loanRequest.purpose || "Loan #" + loanRequest.id.substring(0, 8)}</p>
          </div>
          <Badge
            variant={
              loanRequest.status === "funded" || loanRequest.status === "active"
                ? "default"
                : loanRequest.status === "rejected" || loanRequest.status === "cancelled"
                  ? "destructive"
                  : "secondary"
            }
            className="text-sm"
          >
            {loanRequest.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
              <CardDescription>Details about your loan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Loan Amount</h3>
                  <p className="text-lg font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: loanRequest.currency_code,
                    }).format(loanRequest.loan_amount)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Requested On</h3>
                  <p className="text-lg font-semibold">{new Date(loanRequest.requested_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Purpose</h3>
                <p className="text-base">{loanRequest.purpose || "Not specified"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Repayment Terms</h3>
                <p className="text-base">{loanRequest.repayment_terms || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>Your loan repayment schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center py-6 text-gray-500">No payment schedule available yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Due Date</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{new Date(payment.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: payment.currency_code,
                            }).format(payment.amount_due)}
                          </td>
                          <td className="px-4 py-3">
                            <PaymentStatusBadge status={payment.payment_status} />
                          </td>
                          <td className="px-4 py-3">
                            {payment.payment_status === "scheduled" ? (
                              <Link href={`/borrower/payments/${payment.id}`}>
                                <Button size="sm">Make Payment</Button>
                              </Link>
                            ) : (
                              <Link href={`/borrower/payments/${payment.id}`}>
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Loan Summary</CardTitle>
              <CardDescription>Overview of your loan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Loan Amount</h3>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: loanRequest.currency_code,
                  }).format(loanRequest.loan_amount)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Payments</h3>
                <p className="text-lg font-semibold">{payments.length}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Payments Completed</h3>
                <p className="text-lg font-semibold">
                  {payments.filter((p) => p.payment_status === "completed").length} / {payments.length}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Amount Paid</h3>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: loanRequest.currency_code,
                  }).format(
                    payments
                      .filter((p) => p.payment_status === "completed" && p.amount_paid)
                      .reduce((sum, p) => sum + (p.amount_paid || 0), 0),
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Amount Remaining</h3>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: loanRequest.currency_code,
                  }).format(
                    payments.filter((p) => p.payment_status !== "completed").reduce((sum, p) => sum + p.amount_due, 0),
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Show next payment card if there are scheduled payments */}
          {payments.filter((p) => p.payment_status === "scheduled").length > 0 && (
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Next Payment</CardTitle>
                <CardDescription className="text-blue-700">Your next scheduled payment.</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const nextPayment = payments
                    .filter((p) => p.payment_status === "scheduled")
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

                  if (!nextPayment) return null

                  return (
                    <div className="space-y-2">
                      <p className="text-blue-700">
                        <span className="font-medium">Due Date:</span>{" "}
                        {new Date(nextPayment.due_date).toLocaleDateString()}
                      </p>
                      <p className="text-blue-700">
                        <span className="font-medium">Amount:</span>{" "}
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: nextPayment.currency_code,
                        }).format(nextPayment.amount_due)}
                      </p>
                      <div className="mt-4">
                        <Link href={`/borrower/payments/${nextPayment.id}`}>
                          <Button className="w-full" variant="default">
                            Make Payment
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
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
