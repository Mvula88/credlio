"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  FileText,
  CreditCard,
  Camera,
  Building,
  Home,
  DollarSign,
  FileSignature,
  Users,
  Gavel,
  Video,
  Hash,
  AlertTriangle,
  Info,
  Lock,
  Eye,
  Download,
  Phone,
  Calendar,
  Clock,
  XCircle
} from "lucide-react"
import { DocumentVerificationPanel } from "./document-verification-panel"
import { toast } from "sonner"

interface LoanApprovalChecklistProps {
  loanRequestId: string
  borrowerId: string
  borrowerName: string
  loanAmount: number
  currency: string
  repaymentDate: string
  onApprove?: () => void
  onReject?: () => void
}

interface DocumentCheckItem {
  id: string
  category: string
  name: string
  description: string
  required: boolean
  checked: boolean
  verified: boolean
  hash?: string
  verifiedAt?: Date
  notes?: string
  icon: React.ReactNode
}

interface VerificationCategory {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  items: DocumentCheckItem[]
}

export function LoanApprovalChecklist({
  loanRequestId,
  borrowerId,
  borrowerName,
  loanAmount,
  currency,
  repaymentDate,
  onApprove,
  onReject
}: LoanApprovalChecklistProps) {
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showHashVerification, setShowHashVerification] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [whatsappCallCompleted, setWhatsappCallCompleted] = useState(false)
  const [whatsappCallRecorded, setWhatsappCallRecorded] = useState(false)
  const [documentHashes, setDocumentHashes] = useState<Record<string, string>>({})
  
  const supabase = getSupabaseClient()

  // Initialize verification categories with all required documents
  const [verificationCategories, setVerificationCategories] = useState<VerificationCategory[]>([
    {
      id: "identity",
      name: "Identity Verification",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Government-issued identification documents",
      items: [
        {
          id: "national_id_front",
          category: "identity",
          name: "National ID / Passport / Driver's License (Front)",
          description: "Clear photo of the front side of government-issued ID",
          required: true,
          checked: false,
          verified: false,
          icon: <CreditCard className="h-4 w-4" />
        },
        {
          id: "national_id_back",
          category: "identity",
          name: "National ID / Passport / Driver's License (Back)",
          description: "Clear photo of the back side of government-issued ID",
          required: true,
          checked: false,
          verified: false,
          icon: <CreditCard className="h-4 w-4" />
        },
        {
          id: "selfie_with_id",
          category: "identity",
          name: "Selfie with ID",
          description: "Borrower holding their ID near their face",
          required: true,
          checked: false,
          verified: false,
          icon: <Camera className="h-4 w-4" />
        }
      ]
    },
    {
      id: "financial",
      name: "Financial Documents",
      icon: <Building className="h-5 w-5" />,
      description: "Proof of income and financial stability",
      items: [
        {
          id: "bank_statement_3months",
          category: "financial",
          name: "3-6 Months Bank Statement",
          description: "PDF or screenshot showing financial activity and income flow",
          required: true,
          checked: false,
          verified: false,
          icon: <Building className="h-4 w-4" />
        },
        {
          id: "payslip",
          category: "financial",
          name: "Payslip or Income Proof",
          description: "At least 1-3 months (Optional but encouraged)",
          required: false,
          checked: false,
          verified: false,
          icon: <DollarSign className="h-4 w-4" />
        }
      ]
    },
    {
      id: "address",
      name: "Address Verification",
      icon: <Home className="h-5 w-5" />,
      description: "Proof of current residential address",
      items: [
        {
          id: "proof_of_address",
          category: "address",
          name: "Proof of Address",
          description: "Recent utility bill or rental agreement (within last 3 months)",
          required: true,
          checked: false,
          verified: false,
          icon: <Home className="h-4 w-4" />
        }
      ]
    },
    {
      id: "legal",
      name: "Legal Documents",
      icon: <Gavel className="h-5 w-5" />,
      description: "Legal agreements and consents",
      items: [
        {
          id: "loan_agreement",
          category: "legal",
          name: "Signed Digital Loan Agreement",
          description: "Platform-generated agreement digitally signed by borrower",
          required: true,
          checked: false,
          verified: false,
          icon: <FileSignature className="h-4 w-4" />
        },
        {
          id: "police_affidavit",
          category: "legal",
          name: "Police Affidavit (if available)",
          description: "Borrower signs and certifies with police or local authority",
          required: false,
          checked: false,
          verified: false,
          icon: <Shield className="h-4 w-4" />
        },
        {
          id: "consent_blacklisting",
          category: "legal",
          name: "Consent to Blacklisting & Legal Action",
          description: "Borrower agrees to potential blacklisting if they fail to pay",
          required: true,
          checked: false,
          verified: false,
          icon: <Gavel className="h-4 w-4" />
        }
      ]
    },
    {
      id: "references",
      name: "References",
      icon: <Users className="h-5 w-5" />,
      description: "Contact information for follow-up",
      items: [
        {
          id: "reference_contacts",
          category: "references",
          name: "Reference Contacts (2-3 people)",
          description: "Full name, phone number, and relationship of references",
          required: true,
          checked: false,
          verified: false,
          icon: <Users className="h-4 w-4" />
        }
      ]
    },
    {
      id: "video_verification",
      name: "Video Verification",
      icon: <Video className="h-5 w-5" />,
      description: "WhatsApp video call verification",
      items: [
        {
          id: "whatsapp_call",
          category: "video_verification",
          name: "WhatsApp Video Call Completed",
          description: "Conducted video call where borrower stated loan details",
          required: true,
          checked: false,
          verified: false,
          icon: <Video className="h-4 w-4" />
        },
        {
          id: "call_recorded",
          category: "video_verification",
          name: "Video Call Recording Saved",
          description: "Recording saved safely on device or cloud",
          required: true,
          checked: false,
          verified: false,
          icon: <Video className="h-4 w-4" />
        }
      ]
    }
  ])

  // Load saved verification status
  useEffect(() => {
    loadVerificationStatus()
  }, [loanRequestId])

  async function loadVerificationStatus() {
    try {
      // Load document metadata and verification status from database
      const { data: metadata } = await supabase
        .from("document_metadata")
        .select("*")
        .eq("profile_id", borrowerId)
        .eq("loan_id", loanRequestId)

      if (metadata) {
        // Update verification status based on stored metadata
        const hashes: Record<string, string> = {}
        metadata.forEach(doc => {
          hashes[doc.document_type] = doc.document_hash
        })
        setDocumentHashes(hashes)
      }
    } catch (error) {
      console.error("Error loading verification status:", error)
    }
  }

  const handleItemCheck = (categoryId: string, itemId: string, checked: boolean) => {
    setVerificationCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          items: category.items.map(item => {
            if (item.id === itemId) {
              return { ...item, checked }
            }
            return item
          })
        }
      }
      return category
    }))
  }

  const verifyDocumentHash = async (documentType: string, providedHash: string) => {
    setVerifying(true)
    try {
      // Check if hash matches stored hash
      const storedHash = documentHashes[documentType]
      if (storedHash && storedHash === providedHash) {
        toast.success("Document hash verified successfully!")
        
        // Update verification status
        setVerificationCategories(prev => prev.map(category => ({
          ...category,
          items: category.items.map(item => {
            if (item.id === documentType) {
              return { ...item, verified: true, hash: providedHash, verifiedAt: new Date() }
            }
            return item
          })
        })))
      } else {
        toast.error("Document hash does not match! Possible tampering detected.")
      }
    } catch (error) {
      console.error("Error verifying hash:", error)
      toast.error("Error verifying document hash")
    } finally {
      setVerifying(false)
    }
  }

  const calculateProgress = () => {
    const allItems = verificationCategories.flatMap(cat => cat.items)
    const requiredItems = allItems.filter(item => item.required)
    const checkedRequired = requiredItems.filter(item => item.checked)
    return (checkedRequired.length / requiredItems.length) * 100
  }

  const canApprove = () => {
    const allItems = verificationCategories.flatMap(cat => cat.items)
    const requiredItems = allItems.filter(item => item.required)
    return requiredItems.every(item => item.checked)
  }

  const handleApprove = async () => {
    if (!canApprove()) {
      toast.error("Please complete all required verifications before approving")
      return
    }

    setLoading(true)
    try {
      // Save verification checklist to database
      const { data: { user } } = await supabase.auth.getUser()
      const { data: lenderProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single()

      if (lenderProfile) {
        // Save verification checklist
        await supabase.from("loan_approval_checklists").insert({
          loan_request_id: loanRequestId,
          lender_id: lenderProfile.id,
          borrower_id: borrowerId,
          checklist_data: verificationCategories,
          whatsapp_call_completed: whatsappCallCompleted,
          whatsapp_call_recorded: whatsappCallRecorded,
          approval_notes: approvalNotes,
          approved_at: new Date().toISOString()
        })

        toast.success("Loan approved successfully!")
        if (onApprove) onApprove()
      }
    } catch (error) {
      console.error("Error approving loan:", error)
      toast.error("Error approving loan")
    } finally {
      setLoading(false)
      setShowApprovalDialog(false)
    }
  }

  const progress = calculateProgress()
  const isComplete = canApprove()

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Loan Approval Checklist
              </CardTitle>
              <CardDescription>
                Verify all required documents before approving the loan
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Completion</p>
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Important Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important: Document Verification</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p>✓ Verify document authenticity using hash comparison</p>
          <p>✓ Check for signs of tampering or modification</p>
          <p>✓ Keep all documents safely stored offline</p>
          <p>✓ Complete WhatsApp video verification before final approval</p>
        </AlertDescription>
      </Alert>

      {/* Document Hash Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Document Hash Verification
          </CardTitle>
          <CardDescription>
            Verify document integrity by checking hashes for tampering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowHashVerification(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Open Hash Verification Tool
          </Button>
        </CardContent>
      </Card>

      {/* Verification Categories */}
      <Accordion type="single" collapsible className="space-y-4">
        {verificationCategories.map(category => {
          const checkedCount = category.items.filter(item => item.checked).length
          const requiredCount = category.items.filter(item => item.required).length
          
          return (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    {category.icon}
                    <div className="text-left">
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={checkedCount === category.items.length ? "default" : "outline"}>
                    {checkedCount}/{category.items.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-4">
                  {category.items.map(item => (
                    <div 
                      key={item.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border ${
                        item.checked ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) => 
                          handleItemCheck(category.id, item.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={item.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {item.icon}
                          <span className="font-medium">
                            {item.name}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                          {item.verified && (
                            <Badge variant="default" className="ml-2 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Hash Verified
                            </Badge>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        {item.hash && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Hash: {item.hash.substring(0, 16)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* WhatsApp Video Call Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            WhatsApp Video Call Verification
          </CardTitle>
          <CardDescription>
            Mandatory video verification before loan approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              <strong>During the call, the borrower must say:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• "My full name is {borrowerName}"</li>
                <li>• "Today is {new Date().toLocaleDateString()}"</li>
                <li>• "I am requesting a loan of {currency} {loanAmount.toLocaleString()}"</li>
                <li>• "I will repay the loan by {repaymentDate}"</li>
                <li>• "I agree to all terms. If I don't pay, I accept to be blacklisted"</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="whatsapp-call"
                checked={whatsappCallCompleted}
                onCheckedChange={(checked) => setWhatsappCallCompleted(checked as boolean)}
              />
              <Label htmlFor="whatsapp-call" className="cursor-pointer">
                I have completed the WhatsApp video verification call
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox
                id="call-recorded"
                checked={whatsappCallRecorded}
                onCheckedChange={(checked) => setWhatsappCallRecorded(checked as boolean)}
              />
              <Label htmlFor="call-recorded" className="cursor-pointer">
                I have recorded and safely stored the video call
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>
            Add any observations or concerns about this loan request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter any additional notes or observations..."
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReject}>
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogTrigger asChild>
            <Button 
              disabled={!isComplete || !whatsappCallCompleted || !whatsappCallRecorded}
              variant="default"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Loan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Loan Approval</DialogTitle>
              <DialogDescription>
                Please confirm that you have verified all documents and completed all requirements.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  By approving this loan, you confirm that:
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>✓ All required documents have been verified</li>
                    <li>✓ Document hashes have been checked for tampering</li>
                    <li>✓ WhatsApp video call has been completed and recorded</li>
                    <li>✓ You have safely stored all documents offline</li>
                    <li>✓ The borrower meets all lending criteria</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? "Processing..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hash Verification Dialog */}
      <Dialog open={showHashVerification} onOpenChange={setShowHashVerification}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Hash Verification</DialogTitle>
            <DialogDescription>
              Upload documents to verify their hash matches the stored values
            </DialogDescription>
          </DialogHeader>
          
          <DocumentVerificationPanel
            borrowerId={borrowerId}
            loanRequestId={loanRequestId}
            onVerificationComplete={() => {
              loadVerificationStatus()
              setShowHashVerification(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}