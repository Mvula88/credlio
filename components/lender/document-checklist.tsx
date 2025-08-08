"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, FileCheck } from "lucide-react"
import type { DocumentChecklist } from "@/lib/types/reputation"

interface DocumentChecklistDialogProps {
  loanId: string
  loanOfferId: string
  lenderId: string
  borrowerId: string
  onClose: () => void
}

export function DocumentChecklistDialog({
  loanId,
  loanOfferId,
  lenderId,
  borrowerId,
  onClose,
}: DocumentChecklistDialogProps) {
  const [checklist, setChecklist] = useState<Partial<DocumentChecklist>>({
    national_id_verified: false,
    proof_of_income_verified: false,
    proof_of_address_verified: false,
    bank_statement_verified: false,
    employment_letter_verified: false,
    guarantor_verified: false,
    additional_notes: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchChecklist()
  }, [loanOfferId])

  async function fetchChecklist() {
    try {
      const { data, error } = await supabase
        .from("document_checklists")
        .select("*")
        .eq("loan_offer_id", loanOfferId)
        .single()

      if (error && error.code !== "PGRST116") throw error // PGRST116 = not found

      if (data) {
        setChecklist(data)
      }
    } catch (error) {
      console.error("Error fetching checklist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")

    try {
      const checklistData = {
        loan_offer_id: loanOfferId,
        lender_id: lenderId,
        borrower_id: borrowerId,
        ...checklist,
        last_updated: new Date().toISOString(),
      }

      const { error } = await supabase.from("document_checklists").upsert(checklistData, {
        onConflict: "loan_offer_id",
      })

      if (error) throw error

      onClose()
    } catch (err: any) {
      console.error("Error saving checklist:", err)
      setError(err.message || "Failed to save checklist")
    } finally {
      setSaving(false)
    }
  }

  const documentTypes = [
    {
      key: "national_id_verified",
      label: "National ID / Passport",
      description: "Government-issued identification",
    },
    {
      key: "proof_of_income_verified",
      label: "Proof of Income",
      description: "Salary slips, bank statements showing income",
    },
    {
      key: "proof_of_address_verified",
      label: "Proof of Address",
      description: "Utility bill, lease agreement",
    },
    {
      key: "bank_statement_verified",
      label: "Bank Statement",
      description: "Recent 3-6 months statements",
    },
    {
      key: "employment_letter_verified",
      label: "Employment Letter",
      description: "Letter from employer confirming employment",
    },
    {
      key: "guarantor_verified",
      label: "Guarantor Documents",
      description: "Guarantor's ID and consent form",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <FileCheck className="h-4 w-4" />
        <AlertDescription>
          Please verify that you have received and reviewed these documents offline. This checklist
          helps track document collection but does not store the actual documents.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {documentTypes.map((doc) => (
          <div key={doc.key} className="flex items-start space-x-3">
            <Checkbox
              id={doc.key}
              checked={(checklist[doc.key as keyof DocumentChecklist] as boolean) || false}
              onCheckedChange={(checked) => setChecklist({ ...checklist, [doc.key]: checked })}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor={doc.key} className="cursor-pointer font-medium">
                {doc.label}
              </Label>
              <p className="text-sm text-muted-foreground">{doc.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          value={checklist.additional_notes || ""}
          onChange={(e) => setChecklist({ ...checklist, additional_notes: e.target.value })}
          placeholder="Any additional notes about document verification..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Checklist
        </Button>
      </div>
    </div>
  )
}
