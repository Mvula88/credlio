"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { initiatePaymentAction } from "@/app/actions/payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import type { LoanPayment } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, InfoIcon } from "lucide-react"

interface PaymentRecordFormProps {
  payment: LoanPayment
  borrowerProfileId: string
}

const initialState = {
  message: "",
  errors: null,
  success: false,
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Recording..." : "Record Payment"}
    </Button>
  )
}

export function PaymentRecordForm({ payment, borrowerProfileId }: PaymentRecordFormProps) {
  const [state, formAction] = useFormState(initiatePaymentAction, initialState)
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer")

  // Handle success/error toasts
  if (state.success && state.message) {
    toast({ title: "Success", description: state.message })
  } else if (!state.success && state.message) {
    toast({ title: "Error", description: state.message, variant: "destructive" })
  }

  // Don't show the form if payment is not in 'scheduled' status
  if (payment.payment_status !== "scheduled") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Status: {payment.payment_status}</CardTitle>
          <CardDescription>
            This payment is already {payment.payment_status}. No action is required.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Your Payment</CardTitle>
        <CardDescription>
          Record the payment you've made directly to the lender. The lender will need to confirm
          receipt.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="borrowerProfileId" value={borrowerProfileId} />
          <input type="hidden" name="lenderProfileId" value={payment.lender_profile_id} />
          <input type="hidden" name="loanRequestId" value={payment.loan_request_id} />

          <div className="flex items-center justify-between rounded-md bg-muted p-3">
            <div>
              <p className="text-sm font-medium">Amount Due</p>
              <p className="text-lg font-bold">
                {payment.amount_due} {payment.currency_code}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Due Date</p>
              <div className="flex items-center">
                <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
                <p>{new Date(payment.due_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Please make your payment directly to the lender using your preferred method, then
              record the details here.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">How did you pay?</Label>
            <Select
              name="paymentMethod"
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {state.errors?.paymentMethod && (
              <p className="text-sm text-red-500">{state.errors.paymentMethod}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionReference">Reference Number (Optional)</Label>
            <Input
              id="transactionReference"
              name="transactionReference"
              placeholder="Transaction ID, check number, etc."
            />
            <p className="text-xs text-gray-500">
              If applicable, provide a reference number for this payment
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Payment Details</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add any details about your payment that might help the lender confirm it"
              rows={3}
            />
          </div>

          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  )
}
