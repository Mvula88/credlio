"use client"

import { useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"

interface CreateLoanRequestFormProps {
  borrowerId: string
  onSuccess: () => void
}

export function CreateLoanRequestForm({ borrowerId, onSuccess }: CreateLoanRequestFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    description: "",
    repaymentPeriod: "",
    interestRate: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = getSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: insertError } = await supabase.from("loan_requests").insert({
        borrower_id: borrowerId,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        description: formData.description || null,
        repayment_period: parseInt(formData.repaymentPeriod),
        interest_rate: formData.interestRate ? parseFloat(formData.interestRate) : null,
        currency: "USD",
      })

      if (insertError) throw insertError

      onSuccess()
    } catch (err: any) {
      console.error("Error creating loan request:", err)
      setError(err.message || "Failed to create loan request")
    } finally {
      setLoading(false)
    }
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
        <Label htmlFor="amount">Loan Amount (USD)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="1"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          disabled={loading}
          placeholder="e.g., 1000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Input
          id="purpose"
          type="text"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          required
          disabled={loading}
          placeholder="e.g., Business expansion"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">Brief title for your loan request</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={loading}
          placeholder="Provide more details about why you need this loan..."
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="repaymentPeriod">Repayment Period (days)</Label>
        <Input
          id="repaymentPeriod"
          type="number"
          min="1"
          max="365"
          value={formData.repaymentPeriod}
          onChange={(e) => setFormData({ ...formData, repaymentPeriod: e.target.value })}
          required
          disabled={loading}
          placeholder="e.g., 30"
        />
        <p className="text-xs text-muted-foreground">How many days you need to repay the loan</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interestRate">Suggested Interest Rate (%) - Optional</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          disabled={loading}
          placeholder="e.g., 10"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to let lenders propose their rates
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your loan request will be visible to all lenders in the marketplace. Make sure to provide
          accurate information to build trust.
        </AlertDescription>
      </Alert>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Loan Request
      </Button>
    </form>
  )
}
