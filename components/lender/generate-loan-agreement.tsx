"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, AlertTriangle, Download, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface LoanRequest {
  id: string
  amount_requested: number
  purpose: string
  borrower: {
    full_name: string
    email: string
    phone_number?: string
  }
  country: {
    currency_symbol: string
    currency_code: string
  }
}

interface GenerateLoanAgreementProps {
  loanRequest: LoanRequest
  onAgreementGenerated?: (agreementId: string) => void
}

export function GenerateLoanAgreement({ loanRequest, onAgreementGenerated }: GenerateLoanAgreementProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [agreementData, setAgreementData] = useState({
    loanAmount: loanRequest.amount_requested.toString(),
    interestRate: "15",
    loanTerm: "12",
    repaymentFrequency: "monthly",
    collateralDescription: "",
    additionalTerms: "",
    latePaymentPenalty: "5.0",
    defaultGracePeriod: "7"
  })

  const handleInputChange = (field: string, value: string) => {
    setAgreementData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const calculateTotalRepayment = () => {
    const principal = parseFloat(agreementData.loanAmount)
    const rate = parseFloat(agreementData.interestRate) / 100
    const term = parseInt(agreementData.loanTerm)
    
    if (agreementData.repaymentFrequency === "monthly") {
      const monthlyRate = rate / 12
      const totalInterest = principal * monthlyRate * term
      return principal + totalInterest
    } else if (agreementData.repaymentFrequency === "weekly") {
      const weeklyRate = rate / 52
      const totalInterest = principal * weeklyRate * term
      return principal + totalInterest
    }
    
    return principal + (principal * rate * term)
  }

  const calculateRepaymentAmount = () => {
    const total = calculateTotalRepayment()
    const term = parseInt(agreementData.loanTerm)
    return total / term
  }

  const handleGenerateAgreement = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Validate inputs
      if (!agreementData.loanAmount || parseFloat(agreementData.loanAmount) <= 0) {
        throw new Error("Please enter a valid loan amount")
      }
      if (!agreementData.interestRate || parseFloat(agreementData.interestRate) < 0) {
        throw new Error("Please enter a valid interest rate")
      }
      if (!agreementData.loanTerm || parseInt(agreementData.loanTerm) <= 0) {
        throw new Error("Please enter a valid loan term")
      }

      const response = await fetch(`/api/loans/${loanRequest.id}/generate-agreement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agreementData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate agreement')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loan-agreement-${loanRequest.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Loan agreement generated successfully!", {
        description: "The PDF has been downloaded to your device."
      })

      if (onAgreementGenerated) {
        onAgreementGenerated(loanRequest.id)
      }

    } catch (error: any) {
      console.error("Error generating agreement:", error)
      setError(error.message)
      toast.error("Failed to generate agreement", {
        description: error.message
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const currency = loanRequest.country.currency_symbol || loanRequest.country.currency_code

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Loan Agreement
        </CardTitle>
        <CardDescription>
          Create a legally binding loan agreement for borrower: {loanRequest.borrower.full_name}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Loan Terms Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Loan Terms</h3>
            
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount ({currency})</Label>
              <Input
                id="loanAmount"
                type="number"
                value={agreementData.loanAmount}
                onChange={(e) => handleInputChange("loanAmount", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                value={agreementData.interestRate}
                onChange={(e) => handleInputChange("interestRate", e.target.value)}
                placeholder="15.0"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanTerm">Loan Term</Label>
              <Input
                id="loanTerm"
                type="number"
                value={agreementData.loanTerm}
                onChange={(e) => handleInputChange("loanTerm", e.target.value)}
                placeholder="12"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repaymentFrequency">Repayment Frequency</Label>
              <Select
                value={agreementData.repaymentFrequency}
                onValueChange={(value) => handleInputChange("repaymentFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Summary</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Principal Amount:</span>
                <span className="font-semibold">{currency} {parseFloat(agreementData.loanAmount || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Repayment:</span>
                <span className="font-semibold">{currency} {calculateTotalRepayment().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Per {agreementData.repaymentFrequency} Payment:</span>
                <span className="font-semibold">{currency} {calculateRepaymentAmount().toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latePaymentPenalty">Late Payment Penalty (%)</Label>
              <Input
                id="latePaymentPenalty"
                type="number"
                value={agreementData.latePaymentPenalty}
                onChange={(e) => handleInputChange("latePaymentPenalty", e.target.value)}
                placeholder="5.0"
                min="0"
                max="50"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultGracePeriod">Default Grace Period (days)</Label>
              <Input
                id="defaultGracePeriod"
                type="number"
                value={agreementData.defaultGracePeriod}
                onChange={(e) => handleInputChange("defaultGracePeriod", e.target.value)}
                placeholder="7"
                min="1"
                max="30"
              />
            </div>
          </div>
        </div>

        {/* Additional Terms Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Additional Terms</h3>
          
          <div className="space-y-2">
            <Label htmlFor="collateralDescription">Collateral Description (Optional)</Label>
            <Textarea
              id="collateralDescription"
              value={agreementData.collateralDescription}
              onChange={(e) => handleInputChange("collateralDescription", e.target.value)}
              placeholder="Describe any collateral securing this loan..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalTerms">Additional Terms & Conditions (Optional)</Label>
            <Textarea
              id="additionalTerms"
              value={agreementData.additionalTerms}
              onChange={(e) => handleInputChange("additionalTerms", e.target.value)}
              placeholder="Add any specific terms, conditions, or requirements..."
              rows={4}
            />
          </div>
        </div>

        {/* Legal Warning */}
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Legal Notice:</strong> This agreement includes automatic reporting to credit bureaus and potential legal action for non-payment. 
            The borrower will be marked as a bad borrower and may face blacklisting from the platform and other financial services upon default.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleGenerateAgreement}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Agreement...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Agreement
              </>
            )}
          </Button>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the generated agreement PDF</li>
                <li>Review all terms carefully</li>
                <li>Send the agreement to the borrower: {loanRequest.borrower.email}</li>
                <li>The borrower will fill in their personal details and sign</li>
                <li>Upon signature, the loan will be activated</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}