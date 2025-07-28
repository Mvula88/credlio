"use client"
import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { createLoanRequestAction } from "@/app/actions/loan-requests" // We'll create this
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface CreateLoanRequestFormProps {
  profileId: string
  countryId: string
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
      {pending ? "Submitting Request..." : "Submit Loan Request"}
    </Button>
  )
}

export function CreateLoanRequestForm({ profileId, countryId }: CreateLoanRequestFormProps) {
  const [state, formAction] = useFormState(createLoanRequestAction, initialState)
  const { toast } = useToast()
  const [currency, setCurrency] = useState("USD") // Default or fetch from country settings

  // TODO: Fetch currency based on countryId or provide a selector
  // For now, we'll hardcode or allow manual input.

  if (state.success && state.message) {
    toast({ title: "Success", description: state.message })
    // Optionally reset form or redirect
  } else if (!state.success && state.message) {
    toast({ title: "Error", description: state.message, variant: "destructive" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a New Loan</CardTitle>
        <CardDescription>Fill in the details below to submit your loan application.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="borrowerProfileId" value={profileId} />
          <input type="hidden" name="countryId" value={countryId} />

          <div className="space-y-2">
            <Label htmlFor="loanAmount">Loan Amount</Label>
            <Input id="loanAmount" name="loanAmount" type="number" step="0.01" required />
            {state.errors?.loanAmount && <p className="text-sm text-red-500">{state.errors.loanAmount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currencyCode">Currency Code</Label>
            <Input
              id="currencyCode"
              name="currencyCode"
              type="text"
              maxLength={3}
              defaultValue={currency} // Example: USD, EUR, KES
              required
              placeholder="e.g., USD"
            />
            {state.errors?.currencyCode && <p className="text-sm text-red-500">{state.errors.currencyCode}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Loan</Label>
            <Textarea id="purpose" name="purpose" rows={3} required />
            {state.errors?.purpose && <p className="text-sm text-red-500">{state.errors.purpose}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="repaymentTerms">Repayment Terms (e.g., 12 months)</Label>
            <Input id="repaymentTerms" name="repaymentTerms" type="text" required />
            {state.errors?.repaymentTerms && <p className="text-sm text-red-500">{state.errors.repaymentTerms}</p>}
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
