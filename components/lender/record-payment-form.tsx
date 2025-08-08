"use client"

import { useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, AlertCircle, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { ActiveLoan } from "@/lib/types/reputation"

interface RecordPaymentFormProps {
  loan: ActiveLoan
  onSuccess: () => void
}

export function RecordPaymentForm({ loan, onSuccess }: RecordPaymentFormProps) {
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date())
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = getSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentDate) return

    setLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.rpc("record_loan_behavior", {
        p_loan_id: loan.id,
        p_payment_date: format(paymentDate, "yyyy-MM-dd"),
        p_notes: notes || null,
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || "Failed to record payment")
      }

      onSuccess()
    } catch (err: any) {
      console.error("Error recording payment:", err)
      setError(err.message || "Failed to record payment")
    } finally {
      setLoading(false)
    }
  }

  const getDaysFromDue = () => {
    if (!paymentDate) return 0
    const dueDate = new Date(loan.repayment_date)
    const diffTime = paymentDate.getTime() - dueDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getPaymentStatus = () => {
    const days = getDaysFromDue()
    if (days <= -7) return { text: "Early payment", className: "text-green-600" }
    if (days <= 0) return { text: "On-time payment", className: "text-green-600" }
    if (days <= 7) return { text: "Late payment", className: "text-yellow-600" }
    if (days <= 30) return { text: "Very late payment", className: "text-orange-600" }
    return { text: "Defaulted", className: "text-red-600" }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 rounded-lg bg-gray-50 p-4">
        <div className="flex justify-between text-sm">
          <span>Borrower:</span>
          <span className="font-medium">{loan.borrower?.full_name || "Unknown"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Due:</span>
          <span className="font-medium">{formatCurrency(loan.total_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Due Date:</span>
          <span className="font-medium">{new Date(loan.repayment_date).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !paymentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {paymentDate ? format(paymentDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
          </PopoverContent>
        </Popover>

        {paymentDate && (
          <p className={cn("text-sm", getPaymentStatus().className)}>
            {getPaymentStatus().text} ({Math.abs(getDaysFromDue())} days{" "}
            {getDaysFromDue() >= 0 ? "late" : "early"})
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          placeholder="Any additional notes about this payment..."
        />
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This will record the borrower's repayment behavior and update their reputation score. Make
          sure the payment has been received offline before recording.
        </AlertDescription>
      </Alert>

      <Button type="submit" className="w-full" disabled={loading || !paymentDate}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Payment
      </Button>
    </form>
  )
}
