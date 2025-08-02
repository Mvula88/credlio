"use client"

import type React from "react"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { initiatePaymentAction } from "@/app/actions/payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, FileText, Upload, AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import type { LoanPayment } from "@/lib/types"

interface EnhancedPaymentFormProps {
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
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Payment...
        </>
      ) : (
        <>
          Submit Payment <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  )
}

export function EnhancedPaymentForm({ payment, borrowerProfileId }: EnhancedPaymentFormProps) {
  const [state, formAction] = useFormState(initiatePaymentAction, initialState)
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer")
  const [paymentStep, setPaymentStep] = useState<"method" | "details" | "confirm">("method")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setReceiptFile(file)

      // Create a preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle success/error toasts
  if (state.success && state.message) {
    toast({ title: "Payment Initiated", description: state.message })
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
    <Card className="w-full">
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
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-gray-200"></div>
            <ol className="relative z-10 flex justify-between">
              <li className="flex items-center justify-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    paymentStep === "method"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary bg-background text-primary"
                  }`}
                >
                  1
                </div>
              </li>
              <li className="flex items-center justify-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    paymentStep === "details"
                      ? "border-primary bg-primary text-primary-foreground"
                      : paymentStep === "confirm"
                        ? "border-primary bg-background text-primary"
                        : "border-gray-300 bg-background text-gray-400"
                  }`}
                >
                  2
                </div>
              </li>
              <li className="flex items-center justify-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    paymentStep === "confirm"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-300 bg-background text-gray-400"
                  }`}
                >
                  3
                </div>
              </li>
            </ol>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className={paymentStep === "method" ? "font-medium text-primary" : ""}>
              Payment Method
            </span>
            <span className={paymentStep === "details" ? "font-medium text-primary" : ""}>
              Payment Details
            </span>
            <span className={paymentStep === "confirm" ? "font-medium text-primary" : ""}>
              Confirm
            </span>
          </div>
        </div>

        <form action={formAction}>
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="borrowerProfileId" value={borrowerProfileId} />
          <input type="hidden" name="lenderProfileId" value={payment.lender_profile_id} />
          <input type="hidden" name="loanRequestId" value={payment.loan_request_id} />
          <input type="hidden" name="paymentMethod" value={paymentMethod} />

          {paymentStep === "method" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <div>
                    <RadioGroupItem
                      value="bank_transfer"
                      id="bank_transfer"
                      className="peer sr-only"
                      aria-label="Bank Transfer"
                    />
                    <Label
                      htmlFor="bank_transfer"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <FileText className="mb-3 h-6 w-6" />
                      <span className="font-medium">Bank Transfer</span>
                      <span className="text-xs text-muted-foreground">
                        Direct bank to bank transfer
                      </span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="mobile_money"
                      id="mobile_money"
                      className="peer sr-only"
                      aria-label="Mobile Money"
                    />
                    <Label
                      htmlFor="mobile_money"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mb-3 h-6 w-6"
                      >
                        <path d="M4 7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path>
                        <path d="M9 10h6"></path>
                        <path d="M12 7v6"></path>
                        <path d="M9 17h6"></path>
                      </svg>
                      <span className="font-medium">Mobile Money</span>
                      <span className="text-xs text-muted-foreground">M-Pesa, MTN, etc.</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="card_payment"
                      id="card_payment"
                      className="peer sr-only"
                      aria-label="Card Payment"
                    />
                    <Label
                      htmlFor="card_payment"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <CreditCard className="mb-3 h-6 w-6" />
                      <span className="font-medium">Card Payment</span>
                      <span className="text-xs text-muted-foreground">Credit or debit card</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem
                      value="cash"
                      id="cash"
                      className="peer sr-only"
                      aria-label="Cash"
                    />
                    <Label
                      htmlFor="cash"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mb-3 h-6 w-6"
                      >
                        <rect width="20" height="12" x="2" y="6" rx="2"></rect>
                        <circle cx="12" cy="12" r="2"></circle>
                        <path d="M6 12h.01M18 12h.01"></path>
                      </svg>
                      <span className="font-medium">Cash</span>
                      <span className="text-xs text-muted-foreground">In-person payment</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => setPaymentStep("details")}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {paymentStep === "details" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transactionReference">Transaction Reference</Label>
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
                <Label htmlFor="receiptUpload">Upload Receipt (Optional)</Label>
                <div className="flex w-full items-center justify-center">
                  <label
                    htmlFor="receiptUpload"
                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 hover:bg-gray-100"
                  >
                    {receiptPreview ? (
                      <div className="relative h-full w-full">
                        <img
                          src={receiptPreview || "/placeholder.svg"}
                          alt="Receipt preview"
                          className="h-full w-full object-contain p-2"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity hover:opacity-100">
                          <p className="text-sm text-white">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pb-6 pt-5">
                        <Upload className="mb-3 h-8 w-8 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or PDF (MAX. 10MB)</p>
                      </div>
                    )}
                    <input
                      id="receiptUpload"
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional information about this payment"
                  rows={3}
                />
                {state.errors?.notes && (
                  <p className="text-sm text-red-500">{state.errors.notes}</p>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep("method")}>
                  Back
                </Button>
                <Button type="button" onClick={() => setPaymentStep("confirm")}>
                  Review Payment <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {paymentStep === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-medium">Payment Summary</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Amount:</dt>
                    <dd className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: payment.currency_code,
                      }).format(payment.amount_due)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Due Date:</dt>
                    <dd>{new Date(payment.due_date).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Payment Method:</dt>
                    <dd>{paymentMethod.replace(/_/g, " ")}</dd>
                  </div>
                  {receiptFile && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Receipt:</dt>
                      <dd>{receiptFile.name}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By submitting this payment, you confirm that you have made the payment as
                  described above. The lender will need to confirm receipt before the payment is
                  marked as completed.
                </AlertDescription>
              </Alert>

              {state.message && !state.success && (
                <Alert variant="destructive">
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentStep("details")}>
                  Back
                </Button>
                <SubmitButton />
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
