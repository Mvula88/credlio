"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { initiatePaymentAction } from "@/app/actions/payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface PaymentInitiateFormProps {
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
      {pending ? "Submitting Payment..." : "Submit Payment"}
    </Button>
  )
}

export function PaymentInitiateForm({ payment, borrowerProfileId }: PaymentInitiateFormProps) {
  const [state, formAction] = useFormState(initiatePaymentAction, initialState)
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer")

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
        <CardTitle>Make Payment</CardTitle>
        <CardDescription>
          Payment due: {new Date(payment.due_date).toLocaleDateString()} - Amount:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: payment.currency_code,
          }).format(payment.amount_due)}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="borrowerProfileId" value={borrowerProfileId} />
          <input type="hidden" name="lenderProfileId" value={payment.lender_profile_id} />
          <input type="hidden" name="loanRequestId" value={payment.loan_request_id} />

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
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
                <SelectItem value="card_payment">Card Payment</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {state.errors?.paymentMethod && (
              <p className="text-sm text-red-500">{state.errors.paymentMethod}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionReference">Transaction Reference (Optional)</Label>
            <Input
              id="transactionReference"
              name="transactionReference"
              placeholder="e.g., Transaction ID, Receipt Number"
            />
            {state.errors?.transactionReference && (
              <p className="text-sm text-red-500">{state.errors.transactionReference}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional information about this payment"
              rows={3}
            />
            {state.errors?.notes && <p className="text-sm text-red-500">{state.errors.notes}</p>}
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
