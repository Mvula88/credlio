"use client"

import { useFormState, useFormStatus } from "react-dom"
import { makeLoanOfferAction } from "@/app/actions/loan-offers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import type { LoanRequest } from "@/lib/types" // Assuming LoanRequest type is available

interface MakeOfferFormProps {
  loanRequest: LoanRequest // The loan request being offered on
  lenderProfileId: string // Current lender's profile ID
  countryId: string // Current lender's country ID (should match loanRequest.country_id)
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
      {pending ? "Submitting Offer..." : "Submit Offer"}
    </Button>
  )
}

export function MakeOfferForm({ loanRequest, lenderProfileId, countryId }: MakeOfferFormProps) {
  const [state, formAction] = useFormState(makeLoanOfferAction, initialState)
  const { toast } = useToast()

  if (state.success && state.message) {
    toast({ title: "Success", description: state.message })
    // Consider redirecting or clearing the form
  } else if (!state.success && state.message && !state.errors?.general?.includes("Duplicate offer.")) {
    // Avoid double toast for duplicate
    toast({ title: "Error", description: state.message, variant: "destructive" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make an Offer</CardTitle>
        <CardDescription>Propose your terms for this loan request.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="loanRequestId" value={loanRequest.id} />
          <input type="hidden" name="lenderProfileId" value={lenderProfileId} />
          <input type="hidden" name="countryId" value={countryId} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offerAmount">Your Offer Amount ({loanRequest.currency_code})</Label>
              <Input
                id="offerAmount"
                name="offerAmount"
                type="number"
                step="0.01"
                defaultValue={loanRequest.loan_amount.toString()} // Default to requested amount
                required
              />
              {state.errors?.offerAmount && (
                <p className="text-sm text-red-500">{state.errors.offerAmount.join(", ")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                type="number"
                step="0.01"
                required
                placeholder="e.g., 12.5"
              />
              {state.errors?.interestRate && (
                <p className="text-sm text-red-500">{state.errors.interestRate.join(", ")}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repaymentTermsProposed">Proposed Repayment Terms</Label>
            <Textarea
              id="repaymentTermsProposed"
              name="repaymentTermsProposed"
              rows={3}
              required
              placeholder="e.g., 12 monthly installments"
              defaultValue={loanRequest.repayment_terms || ""}
            />
            {state.errors?.repaymentTermsProposed && (
              <p className="text-sm text-red-500">{state.errors.repaymentTermsProposed.join(", ")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notesToBorrower">Notes to Borrower (Optional)</Label>
            <Textarea
              id="notesToBorrower"
              name="notesToBorrower"
              rows={2}
              placeholder="Any additional comments for the borrower"
            />
            {state.errors?.notesToBorrower && (
              <p className="text-sm text-red-500">{state.errors.notesToBorrower.join(", ")}</p>
            )}
          </div>

          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertDescription>{state.errors?.general?.join(", ") || state.message}</AlertDescription>
            </Alert>
          )}
          {state.success && state.message && (
            <Alert variant="default">
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
