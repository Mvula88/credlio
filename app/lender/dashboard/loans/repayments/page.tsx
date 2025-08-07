import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { format } from "date-fns"
import { CheckCircle, Clock, AlertCircle, DollarSign } from "lucide-react"

async function getRepayments(lenderId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data: payments, error } = await supabase
    .from("loan_payments")
    .select(`
      *,
      loan_offers(
        offered_amount,
        interest_rate,
        duration_months
      ),
      borrower:borrower_profile_id(
        full_name,
        email,
        phone_number
      )
    `)
    .eq("lender_profile_id", lenderId)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching repayments:", error)
    return []
  }

  return payments || []
}

export default async function RepaymentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "lender") {
    redirect("/")
  }

  const repayments = await getRepayments(profile.id)

  const totalExpected = repayments.reduce((sum, p) => sum + p.amount_due, 0)
  const totalReceived = repayments.reduce((sum, p) => sum + p.amount_paid, 0)
  const pendingPayments = repayments.filter(p => p.status === "pending")
  const overduePayments = repayments.filter(p => 
    p.status === "pending" && new Date(p.due_date) < new Date()
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Loan Repayments</h1>
        <p className="text-muted-foreground">Track and manage loan repayments from borrowers</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From all loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalReceived.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Successfully collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overduePayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repayment Schedule</CardTitle>
          <CardDescription>
            All scheduled and completed loan repayments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No repayments scheduled yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayments.map((payment) => {
                  const isOverdue = payment.status === "pending" && 
                    new Date(payment.due_date) < new Date()
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.borrower?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.borrower?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${payment.amount_due.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ${payment.amount_paid.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.due_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            payment.status === "completed" ? "default" :
                            isOverdue ? "destructive" : "secondary"
                          }
                        >
                          {payment.status === "completed" ? "Paid" :
                           isOverdue ? "Overdue" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.payment_date ? 
                          format(new Date(payment.payment_date), "MMM dd, yyyy") : 
                          "-"
                        }
                      </TableCell>
                      <TableCell>
                        {payment.status === "pending" && (
                          <Button size="sm" variant="outline">
                            Send Reminder
                          </Button>
                        )}
                        {payment.status === "completed" && (
                          <Button size="sm" variant="outline">
                            View Receipt
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}