"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Shield, Upload, UserX } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"

export default function ReportDefaulterPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    borrowerName: "",
    borrowerEmail: "",
    borrowerPhone: "",
    loanAmount: "",
    loanDate: "",
    dueDate: "",
    amountOwed: "",
    lastContactDate: "",
    defaultReason: "",
    attempts: "",
    evidence: "",
    additionalNotes: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) throw new Error("Profile not found")

      // Check if borrower exists in the system
      const { data: existingBorrower } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.borrowerEmail)
        .eq("role", "borrower")
        .single()

      // Add to blacklisted borrowers
      const { error: blacklistError } = await supabase
        .from("blacklisted_borrowers")
        .insert({
          borrower_profile_id: existingBorrower?.id || null,
          lender_profile_id: profile.id,
          reason: formData.defaultReason,
          amount_owed: parseFloat(formData.amountOwed),
          loan_date: formData.loanDate,
          due_date: formData.dueDate,
          last_contact_date: formData.lastContactDate,
          recovery_attempts: parseInt(formData.attempts),
          evidence_url: formData.evidence,
          additional_notes: formData.additionalNotes,
          borrower_name: formData.borrowerName,
          borrower_email: formData.borrowerEmail,
          borrower_phone: formData.borrowerPhone,
          original_loan_amount: parseFloat(formData.loanAmount),
          deregistered: false
        })

      if (blacklistError) throw blacklistError

      // Create a compliance log
      await supabase
        .from("compliance_logs")
        .insert({
          log_type: "defaulter_reported",
          severity: "warning",
          user_id: profile.id,
          description: `Defaulter reported: ${formData.borrowerName} (${formData.borrowerEmail}) - Amount: $${formData.amountOwed}`,
          metadata: {
            borrower_email: formData.borrowerEmail,
            amount_owed: formData.amountOwed,
            reason: formData.defaultReason
          }
        })

      toast.success("Defaulter reported successfully")
      router.push("/lender/dashboard/risk/blacklist")
    } catch (error: any) {
      console.error("Error reporting defaulter:", error)
      toast.error(error.message || "Failed to report defaulter")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <UserX className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Report a Defaulted Borrower</h1>
            <p className="text-gray-600">
              Help protect other lenders by reporting borrowers who have not repaid their loans
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-amber-200 bg-amber-50 mb-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <CardTitle className="text-amber-900">Important Notice</CardTitle>
              <CardDescription className="text-amber-700 mt-2">
                Please ensure all information provided is accurate and truthful. False reports may result in legal action.
                This information will be shared with other lenders on the platform to prevent future defaults.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Borrower Information */}
          <Card>
            <CardHeader>
              <CardTitle>Borrower Information</CardTitle>
              <CardDescription>
                Provide details about the borrower who defaulted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="borrowerName">Full Name *</Label>
                  <Input
                    id="borrowerName"
                    name="borrowerName"
                    value={formData.borrowerName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="borrowerEmail">Email Address *</Label>
                  <Input
                    id="borrowerEmail"
                    name="borrowerEmail"
                    type="email"
                    value={formData.borrowerEmail}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="borrowerPhone">Phone Number</Label>
                  <Input
                    id="borrowerPhone"
                    name="borrowerPhone"
                    value={formData.borrowerPhone}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>
                Information about the defaulted loan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loanAmount">Original Loan Amount ($) *</Label>
                  <Input
                    id="loanAmount"
                    name="loanAmount"
                    type="number"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    placeholder="10000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amountOwed">Current Amount Owed ($) *</Label>
                  <Input
                    id="amountOwed"
                    name="amountOwed"
                    type="number"
                    value={formData.amountOwed}
                    onChange={handleInputChange}
                    placeholder="12000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="loanDate">Loan Issue Date *</Label>
                  <Input
                    id="loanDate"
                    name="loanDate"
                    type="date"
                    value={formData.loanDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Original Due Date *</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default Information */}
          <Card>
            <CardHeader>
              <CardTitle>Default Information</CardTitle>
              <CardDescription>
                Details about the default and recovery attempts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lastContactDate">Last Contact Date</Label>
                  <Input
                    id="lastContactDate"
                    name="lastContactDate"
                    type="date"
                    value={formData.lastContactDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="attempts">Number of Recovery Attempts *</Label>
                  <Input
                    id="attempts"
                    name="attempts"
                    type="number"
                    value={formData.attempts}
                    onChange={handleInputChange}
                    placeholder="5"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="defaultReason">Reason for Default *</Label>
                <Select
                  value={formData.defaultReason}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, defaultReason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_response">No Response/Communication</SelectItem>
                    <SelectItem value="refused_payment">Refused to Pay</SelectItem>
                    <SelectItem value="financial_hardship">Claims Financial Hardship</SelectItem>
                    <SelectItem value="disputed_loan">Disputes Loan Terms</SelectItem>
                    <SelectItem value="fraud">Suspected Fraud</SelectItem>
                    <SelectItem value="absconded">Absconded/Cannot Locate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="evidence">Evidence/Documentation URL</Label>
                <Input
                  id="evidence"
                  name="evidence"
                  value={formData.evidence}
                  onChange={handleInputChange}
                  placeholder="Link to evidence (Google Drive, Dropbox, etc.)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a link to loan agreements, communication records, or other evidence
                </p>
              </div>

              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  placeholder="Provide any additional context or information about this default..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirmation"
                  required
                  className="mt-1"
                />
                <label htmlFor="confirmation" className="text-sm text-gray-600">
                  I confirm that all information provided is accurate and true to the best of my knowledge.
                  I understand that false reporting may result in legal consequences and removal from the platform.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Report Defaulter
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}