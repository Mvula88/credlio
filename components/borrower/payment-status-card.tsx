import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import type { LoanPayment } from "@/lib/types"

interface PaymentStatusCardProps {
  payments: LoanPayment[]
}

export function PaymentStatusCard({ payments }: PaymentStatusCardProps) {
  // Calculate payment statistics
  const totalPayments = payments.length
  const completedPayments = payments.filter((p) => p.payment_status === "completed").length
  const pendingPayments = payments.filter((p) => p.payment_status === "pending_confirmation").length
  const overduePayments = payments.filter((p) => p.payment_status === "overdue").length
  const scheduledPayments = payments.filter((p) => p.payment_status === "scheduled").length
  const failedPayments = payments.filter((p) => p.payment_status === "failed").length

  // Calculate completion percentage
  const completionPercentage = totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Progress</CardTitle>
        <CardDescription>Overview of your loan payment status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Completion</span>
            <span className="text-sm font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold">{completedPayments}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold">{pendingPayments}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Scheduled</p>
              <p className="text-2xl font-bold">{scheduledPayments}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Failed/Overdue</p>
              <p className="text-2xl font-bold">{failedPayments + overduePayments}</p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Next payment:</span> {(() => {
              const nextPayment = payments
                .filter((p) => p.payment_status === "scheduled")
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

              return nextPayment ? (
                <span>
                  Due on <span className="font-medium">{new Date(nextPayment.due_date).toLocaleDateString()}</span> (
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: nextPayment.currency_code,
                  }).format(nextPayment.amount_due)}
                  )
                </span>
              ) : (
                "No upcoming payments"
              )
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
