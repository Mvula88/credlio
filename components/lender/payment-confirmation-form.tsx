"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { confirmPaymentAction, markPaymentAsFailedAction } from "@/app/actions/payments"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentConfirmationFormProps {
  payment: LoanPayment
  lenderProfileId: string
}

const initialConfirmState = {
  message: "",
  errors: null,
  success: false,
}

const initialFailState = {
  message: "",
  errors: null,
  success: false,
}

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Confirming..." : "Confirm Payment"}
    </Button>
  )
}

function FailButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="w-full" disabled={pending}>
      {pending ? "Processing..." : "Mark as Failed"}
    </Button>
  )
}

export function PaymentConfirmationForm({
  payment,
  lenderProfileId,
}: PaymentConfirmationFormProps) {
  const [confirmState, confirmAction] = useFormState(confirmPaymentAction, initialConfirmState)
  const [failState, failAction] = useFormState(markPaymentAsFailedAction, initialFailState)
  const { toast } = useToast()
  const [amountPaid, setAmountPaid] = useState<string>(payment.amount_due.toString())

  // Handle success/error toasts
  if (confirmState.success && confirmState.message) {
    toast({ title: "Success", description: confirmState.message })
  } else if (!confirmState.success && confirmState.message) {
    toast({ title: "Error", description: confirmState.message, variant: "destructive" })
  }

  if (failState.success && failState.message) {
    toast({ title: "Payment Failed", description: failState.message })
  } else if (!failState.success && failState.message) {
    toast({ title: "Error", description: failState.message, variant: "destructive" })
  }

  // Don't show the form if payment is not in 'pending_confirmation' status
  if (payment.payment_status !== "pending_confirmation") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Status: {payment.payment_status}</CardTitle>
          <CardDescription>
            This payment is {payment.payment_status}. No confirmation action is required.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Payment</CardTitle>
        <CardDescription>
          Payment initiated by borrower on {new Date(payment.updated_at).toLocaleDateString()} via{" "}
          {payment.payment_method || "unknown method"}
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue="confirm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="confirm">Confirm Payment</TabsTrigger>
          <TabsTrigger value="fail">Mark as Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="confirm">
          <form action={confirmAction}>
            <CardContent className="space-y-4 pt-4">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
              <input type="hidden" name="borrowerProfileId" value={payment.borrower_profile_id} />
              <input type="hidden" name="loanRequestId" value={payment.loan_request_id} />

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Received ({payment.currency_code})</Label>
                <Input
                  id="amountPaid"
                  name="amountPaid"
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Expected amount: {payment.amount_due} {payment.currency_code}
                </p>
                {confirmState.errors?.amountPaid && (
                  <p className="text-sm text-red-500">{confirmState.errors.amountPaid}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNotes">Notes (Optional)</Label>
                <Textarea
                  id="confirmNotes"
                  name="notes"
                  placeholder="Any additional information about this payment confirmation"
                  rows={2}
                />
                {confirmState.errors?.notes && (
                  <p className="text-sm text-red-500">{confirmState.errors.notes}</p>
                )}
              </div>

              {confirmState.message && !confirmState.success && (
                <Alert variant="destructive">
                  <AlertDescription>{confirmState.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <ConfirmButton />
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="fail">
          <form action={failAction}>
            <CardContent className="space-y-4 pt-4">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
              <input type="hidden" name="borrowerProfileId" value={payment.borrower_profile_id} />
              <input type="hidden" name="loanRequestId" value={payment.loan_request_id} />

              <div className="space-y-2">
                <Label htmlFor="failNotes">Reason for Failure (Required)</Label>
                <Textarea
                  id="failNotes"
                  name="notes"
                  placeholder="Please explain why this payment is being marked as failed"
                  rows={3}
                  required
                />
                {failState.errors?.notes && (
                  <p className="text-sm text-red-500">{failState.errors.notes}</p>
                )}
              </div>

              {failState.message && !failState.success && (
                <Alert variant="destructive">
                  <AlertDescription>{failState.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <FailButton />
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
