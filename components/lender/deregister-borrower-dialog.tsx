"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { CheckCircle, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

interface DeregisterBorrowerDialogProps {
  blacklistId: string
  borrowerName: string
  amountOwed: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeregisterBorrowerDialog({
  blacklistId,
  borrowerName,
  amountOwed,
  open,
  onOpenChange,
  onSuccess
}: DeregisterBorrowerDialogProps) {
  const [reason, setReason] = useState("")
  const [paymentProof, setPaymentProof] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for deregistration")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/borrowers/deregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blacklistId,
          reason,
          paymentProof
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to deregister borrower")
      }

      toast.success(`${borrowerName} has been removed from the risky borrowers list`)
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setReason("")
      setPaymentProof("")
    } catch (error) {
      console.error("Deregistration error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to deregister borrower")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from Risky Borrowers List</DialogTitle>
          <DialogDescription>
            Confirm that {borrowerName} has cleared their debt of ${amountOwed.toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Removal *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Full payment received, Debt settled, Payment plan completed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proof">Payment Proof URL (Optional)</Label>
            <Input
              id="proof"
              type="url"
              placeholder="Link to payment receipt or proof"
              value={paymentProof}
              onChange={(e) => setPaymentProof(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Provide a link to payment confirmation if available
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900">This action will:</p>
                <ul className="mt-1 text-green-800 space-y-1">
                  <li>• Remove {borrowerName} from the risky borrowers list</li>
                  <li>• Notify the borrower of their improved status</li>
                  <li>• Improve their risk score</li>
                  <li>• Allow them to access loans again</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm & Remove
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Component for borrowers to request deregistration
export function RequestDeregistrationDialog({
  blacklistId,
  open,
  onOpenChange,
  onSuccess
}: {
  blacklistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [formData, setFormData] = useState({
    paymentAmount: "",
    paymentDate: "",
    paymentReference: "",
    paymentProof: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.paymentAmount || !formData.paymentDate) {
      toast.error("Please fill in required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/borrowers/deregister", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blacklistId,
          ...formData,
          paymentAmount: parseFloat(formData.paymentAmount)
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request")
      }

      toast.success("Deregistration request submitted successfully")
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setFormData({
        paymentAmount: "",
        paymentDate: "",
        paymentReference: "",
        paymentProof: "",
        message: ""
      })
    } catch (error) {
      console.error("Request error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit request")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Removal from Risky List</DialogTitle>
          <DialogDescription>
            Submit proof of payment to request removal from the risky borrowers list
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.paymentAmount}
                onChange={(e) => setFormData({...formData, paymentAmount: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reference">Payment Reference</Label>
            <Input
              id="reference"
              placeholder="Transaction ID or reference number"
              value={formData.paymentReference}
              onChange={(e) => setFormData({...formData, paymentReference: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proof">Payment Proof URL</Label>
            <Input
              id="proof"
              type="url"
              placeholder="Link to payment receipt"
              value={formData.paymentProof}
              onChange={(e) => setFormData({...formData, paymentProof: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message to Lender</Label>
            <Textarea
              id="message"
              placeholder="Explain your payment and request..."
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your request will be sent to the lender for review. 
              You will be notified once they approve or reject your request.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.paymentAmount || !formData.paymentDate}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}