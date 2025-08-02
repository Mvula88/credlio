"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import type { LoanRequest } from "@/lib/types/reputation"

interface MakeOfferFormProps {
  loanRequest: LoanRequest
  lenderId: string
  onSuccess: () => void
}

export function MakeOfferForm({ loanRequest, lenderId, onSuccess }: MakeOfferFormProps) {
  const [formData, setFormData] = useState({
    amount: loanRequest.amount.toString(),
    interestRate: loanRequest.interest_rate?.toString() || "",
    repaymentPeriod: loanRequest.repayment_period.toString(),
    terms: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Check if lender already has an offer for this request
      const { data: existingOffer } = await supabase
        .from("loan_offers")
        .select("id")
        .eq("loan_request_id", loanRequest.id)
        .eq("lender_id", lenderId)
        .single()

      if (existingOffer) {
        throw new Error("You already have an offer for this loan request")
      }

      // Create the offer
      const { error: offerError } = await supabase.from("loan_offers").insert({
        loan_request_id: loanRequest.id,
        lender_id: lenderId,
        borrower_id: loanRequest.borrower_id,
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interestRate),
        repayment_period: parseInt(formData.repaymentPeriod),
        terms: formData.terms || null,
      })

      if (offerError) throw offerError

      onSuccess()
    } catch (err: any) {
      console.error("Error creating offer:", err)
      setError(err.message || "Failed to create offer")
    } finally {
      setLoading(false)
    }
  }

  const calculateTotalRepayment = () => {
    const amount = parseFloat(formData.amount) || 0
    const rate = parseFloat(formData.interestRate) || 0
    return amount * (1 + rate / 100)
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

      <div className="space-y-2">
        <Label htmlFor="amount">Loan Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="1"
          max={loanRequest.amount}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Requested: {formatCurrency(loanRequest.amount)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interestRate">Interest Rate (%)</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          required
          disabled={loading}
          placeholder="e.g., 10"
        />
        {loanRequest.interest_rate && (
          <p className="text-xs text-muted-foreground">Suggested: {loanRequest.interest_rate}%</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="repaymentPeriod">Repayment Period (days)</Label>
        <Input
          id="repaymentPeriod"
          type="number"
          min="1"
          value={formData.repaymentPeriod}
          onChange={(e) => setFormData({ ...formData, repaymentPeriod: e.target.value })}
          required
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Requested: {loanRequest.repayment_period} days
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Additional Terms (optional)</Label>
        <Textarea
          id="terms"
          rows={3}
          value={formData.terms}
          onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
          disabled={loading}
          placeholder="Any specific conditions or requirements..."
        />
      </div>

      <div className="space-y-2 rounded-lg bg-gray-50 p-4">
        <div className="flex justify-between text-sm">
          <span>Principal Amount:</span>
          <span className="font-medium">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Interest ({formData.interestRate || 0}%):</span>
          <span className="font-medium">
            {formatCurrency(
              ((parseFloat(formData.amount) || 0) * (parseFloat(formData.interestRate) || 0)) / 100
            )}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>Total Repayment:</span>
          <span>{formatCurrency(calculateTotalRepayment())}</span>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          By making this offer, you confirm that you will handle all financial transactions and
          document verification offline with the borrower.
        </AlertDescription>
      </Alert>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Offer
      </Button>
    </form>
  )
}
