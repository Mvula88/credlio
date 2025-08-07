"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, FileText, AlertTriangle, Download, PenTool, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import SignatureCanvas from 'react-signature-canvas'

interface LoanAgreement {
  id: string
  agreement_number: string
  loan_amount: number
  interest_rate: number
  loan_term: number
  repayment_frequency: string
  late_payment_penalty: number
  default_grace_period: number
  agreement_status: string
  generated_at: string
  lender: {
    full_name: string
    business_name?: string
  }
  country: {
    currency_symbol: string
    name: string
  }
}

interface LoanAgreementSignatureProps {
  agreement: LoanAgreement
  onAgreementSigned?: () => void
}

export function LoanAgreementSignature({ agreement, onAgreementSigned }: LoanAgreementSignatureProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'review' | 'sign' | 'complete'>('review')
  
  const sigPadRef = useRef<SignatureCanvas>(null)
  
  const [borrowerInfo, setBorrowerInfo] = useState({
    fullName: "",
    idNumber: "",
    phoneNumber: ""
  })
  
  const [confirmations, setConfirmations] = useState({
    readAndUnderstood: false,
    agreeToTerms: false,
    understoodConsequences: false,
    provideAccurateInfo: false
  })

  const handleInputChange = (field: string, value: string) => {
    setBorrowerInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleConfirmationChange = (field: string, checked: boolean) => {
    setConfirmations(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const canProceedToSign = () => {
    return borrowerInfo.fullName.trim() !== "" &&
           borrowerInfo.idNumber.trim() !== "" &&
           borrowerInfo.phoneNumber.trim() !== "" &&
           Object.values(confirmations).every(Boolean)
  }

  const clearSignature = () => {
    sigPadRef.current?.clear()
  }

  const isSignatureEmpty = () => {
    return sigPadRef.current?.isEmpty() ?? true
  }

  const downloadAgreement = async () => {
    try {
      const response = await fetch(`/api/agreements/${agreement.id}/download`)
      if (!response.ok) {
        throw new Error('Failed to download agreement')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loan-agreement-${agreement.agreement_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Agreement downloaded successfully")
    } catch (error: any) {
      toast.error("Failed to download agreement", {
        description: error.message
      })
    }
  }

  const submitSignature = async () => {
    if (isSignatureEmpty()) {
      setError("Please provide your signature")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Get signature data as base64
      const signatureData = sigPadRef.current?.toDataURL()
      
      const response = await fetch(`/api/agreements/${agreement.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowerInfo,
          signature: signatureData,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit signature')
      }

      toast.success("Agreement signed successfully!", {
        description: "Your loan is now active and binding."
      })

      setStep('complete')
      
      if (onAgreementSigned) {
        onAgreementSigned()
      }

    } catch (error: any) {
      console.error("Error submitting signature:", error)
      setError(error.message)
      toast.error("Failed to sign agreement", {
        description: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currency = agreement.country.currency_symbol

  // Step 1: Review and Fill Information
  if (step === 'review') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loan Agreement - {agreement.agreement_number}
          </CardTitle>
          <CardDescription>
            Please review the terms and provide your information to proceed with signing
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Agreement Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Agreement Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Loan Amount:</span>
                <p className="font-semibold">{currency} {agreement.loan_amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Interest Rate:</span>
                <p className="font-semibold">{agreement.interest_rate}% per {agreement.repayment_frequency}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Loan Term:</span>
                <p className="font-semibold">{agreement.loan_term} {agreement.repayment_frequency}(s)</p>
              </div>
              <div>
                <span className="text-muted-foreground">Late Payment Penalty:</span>
                <p className="font-semibold">{agreement.late_payment_penalty}% per late payment</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lender:</span>
                <p className="font-semibold">
                  {agreement.lender.business_name || agreement.lender.full_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Default Grace Period:</span>
                <p className="font-semibold">{agreement.default_grace_period} days</p>
              </div>
            </div>
          </div>

          {/* Download Agreement */}
          <div className="flex justify-center">
            <Button onClick={downloadAgreement} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Full Agreement PDF
            </Button>
          </div>

          {/* Borrower Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (as on ID)</Label>
                <Input
                  id="fullName"
                  value={borrowerInfo.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Enter your full legal name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID/Passport Number</Label>
                <Input
                  id="idNumber"
                  value={borrowerInfo.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                  placeholder="Enter your ID or passport number"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={borrowerInfo.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="+XXX XXX XXXX"
                  required
                />
              </div>
            </div>
          </div>

          {/* Legal Acknowledgments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Legal Acknowledgments</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="readAndUnderstood"
                  checked={confirmations.readAndUnderstood}
                  onCheckedChange={(checked) => handleConfirmationChange("readAndUnderstood", !!checked)}
                />
                <Label htmlFor="readAndUnderstood" className="text-sm leading-5">
                  I have read, downloaded, and fully understand all terms and conditions of this loan agreement.
                </Label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={confirmations.agreeToTerms}
                  onCheckedChange={(checked) => handleConfirmationChange("agreeToTerms", !!checked)}
                />
                <Label htmlFor="agreeToTerms" className="text-sm leading-5">
                  I agree to repay the loan amount plus interest according to the specified repayment schedule.
                </Label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="understoodConsequences"
                  checked={confirmations.understoodConsequences}
                  onCheckedChange={(checked) => handleConfirmationChange("understoodConsequences", !!checked)}
                />
                <Label htmlFor="understoodConsequences" className="text-sm leading-5">
                  <strong>I understand that failure to repay will result in:</strong> Being marked as a bad borrower, 
                  blacklisting from financial services, credit bureau reporting, and potential legal action.
                </Label>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="provideAccurateInfo"
                  checked={confirmations.provideAccurateInfo}
                  onCheckedChange={(checked) => handleConfirmationChange("provideAccurateInfo", !!checked)}
                />
                <Label htmlFor="provideAccurateInfo" className="text-sm leading-5">
                  I certify that all information provided is accurate and I authorize verification of my identity and creditworthiness.
                </Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Final Warning:</strong> This is a legally binding agreement. Signing commits you to repay 
              {currency} {agreement.loan_amount.toLocaleString()} plus interest. Default will severely impact your credit and may result in legal consequences.
            </AlertDescription>
          </Alert>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setStep('sign')}
              disabled={!canProceedToSign()}
              size="lg"
            >
              <PenTool className="mr-2 h-4 w-4" />
              Proceed to Sign Agreement
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Digital Signature
  if (step === 'sign') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Digital Signature
          </CardTitle>
          <CardDescription>
            Sign the agreement using your mouse or touch screen
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Signature Canvas */}
          <div className="space-y-4">
            <Label>Your Digital Signature</Label>
            <div className="border-2 border-gray-300 rounded-lg p-4">
              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: 'signature-canvas w-full'
                }}
                backgroundColor="rgb(255, 255, 255)"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={clearSignature} variant="outline" size="sm">
                Clear Signature
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Signing as:</h4>
            <p><strong>Name:</strong> {borrowerInfo.fullName}</p>
            <p><strong>ID Number:</strong> {borrowerInfo.idNumber}</p>
            <p><strong>Phone:</strong> {borrowerInfo.phoneNumber}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setStep('review')}
              variant="outline"
              className="flex-1"
            >
              Back to Review
            </Button>
            <Button
              onClick={submitSignature}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Agreement...
                </>
              ) : (
                "Sign & Submit Agreement"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 3: Completion
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Agreement Signed Successfully!
        </CardTitle>
        <CardDescription>
          Your loan agreement has been signed and is now active
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Agreement Active:</strong> Your loan of {currency} {agreement.loan_amount.toLocaleString()} is now active. 
            Please ensure timely repayments to maintain your good standing.
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button onClick={() => window.location.href = '/borrower/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}