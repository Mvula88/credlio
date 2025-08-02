"use client"

import { useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileCheck,
  FileX,
  AlertTriangle,
  Upload,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Building,
  Briefcase,
  Hash,
  Calendar,
  AlertCircle
} from "lucide-react"
import {
  verifyBankStatement,
  verifyIDDocument,
  checkDuplicateDocument,
  saveVerificationResult,
  createVerificationAlert,
  type VerificationResult
} from "@/lib/services/document-verification"
import {
  DOCUMENT_REQUIREMENTS,
  getDocumentsByCategory,
  type DocumentCategory
} from "@/lib/constants/document-requirements"

interface DocumentVerificationPanelProps {
  borrowerId: string
  loanRequestId?: string
  category?: DocumentCategory
  onVerificationComplete?: () => void
}

interface VerificationStatus {
  type: string
  status: 'pending' | 'verified' | 'failed' | 'suspicious'
  result?: VerificationResult
  verifiedAt?: Date
}

export function DocumentVerificationPanel({
  borrowerId,
  loanRequestId,
  category,
  onVerificationComplete
}: DocumentVerificationPanelProps) {
  const [verifying, setVerifying] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [currentType, setCurrentType] = useState<string>("")
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({
    national_id: { type: 'national_id', status: 'pending' },
    bank_statement: { type: 'bank_statement', status: 'pending' },
    utility_bill: { type: 'utility_bill', status: 'pending' },
    employment_letter: { type: 'employment_letter', status: 'pending' }
  })
  const [showResults, setShowResults] = useState(false)
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const handleFileSelect = useCallback((file: File, documentType: string) => {
    setCurrentFile(file)
    setCurrentType(documentType)
  }, [])

  const verifyDocument = async () => {
    if (!currentFile || !currentType) return

    setVerifying(true)
    setDuplicateAlert(null)

    try {
      let result: VerificationResult

      // Verify based on document type
      switch (currentType) {
        case 'bank_statement':
          result = await verifyBankStatement(currentFile)
          break
        case 'national_id':
        case 'passport':
          result = await verifyIDDocument(currentFile, currentType as 'national_id' | 'passport')
          break
        default:
          // For other documents, use basic verification
          result = await verifyBankStatement(currentFile) // Reuse logic
          result.documentType = currentType as any
      }

      // Check for duplicate
      const duplicateCheck = await checkDuplicateDocument(
        supabase,
        result.documentHash,
        result.documentType
      )

      if (duplicateCheck.isDuplicate) {
        setDuplicateAlert(`This document has already been used by another user`)
        result.status = 'failed'
        
        // Create alert
        await createVerificationAlert(
          supabase,
          'duplicate_document',
          borrowerId,
          result.documentHash,
          { existingUserId: duplicateCheck.existingUserId }
        )
      }

      // Get current user (lender)
      const { data: { user } } = await supabase.auth.getUser()
      const { data: lenderProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single()

      // Save verification result
      if (lenderProfile) {
        await saveVerificationResult(
          supabase,
          borrowerId,
          result,
          lenderProfile.id
        )
      }

      // Update status
      setVerificationStatuses(prev => ({
        ...prev,
        [currentType]: {
          type: currentType,
          status: result.status as any,
          result,
          verifiedAt: new Date()
        }
      }))

      // Clear current file
      setCurrentFile(null)
      setCurrentType("")

      // Check if all required documents are verified
      checkAllDocumentsVerified()
    } catch (error) {
      console.error("Verification error:", error)
      setVerificationStatuses(prev => ({
        ...prev,
        [currentType]: {
          type: currentType,
          status: 'failed'
        }
      }))
    } finally {
      setVerifying(false)
    }
  }

  const checkAllDocumentsVerified = () => {
    const requiredDocs = ['national_id', 'bank_statement']
    const allVerified = requiredDocs.every(
      doc => verificationStatuses[doc]?.status === 'verified'
    )

    if (allVerified && onVerificationComplete) {
      onVerificationComplete()
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'national_id':
      case 'passport':
        return <CreditCard className="h-5 w-5" />
      case 'bank_statement':
        return <Building className="h-5 w-5" />
      case 'utility_bill':
        return <FileText className="h-5 w-5" />
      case 'employment_letter':
        return <Briefcase className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status.status) {
      case 'verified':
        return <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" /> Verified
        </Badge>
      case 'failed':
        return <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      case 'suspicious':
        return <Badge variant="secondary" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Suspicious
        </Badge>
      default:
        return <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Pending
        </Badge>
    }
  }

  const documentTypes = category 
    ? getDocumentsByCategory(category).map(doc => ({
        id: doc.id,
        label: doc.name,
        required: doc.required
      }))
    : DOCUMENT_REQUIREMENTS.map(doc => ({
        id: doc.id,
        label: doc.name,
        required: doc.required
      }))

  // Calculate verification progress
  const verifiedCount = Object.values(verificationStatuses).filter(
    s => s.status === 'verified'
  ).length
  const progress = (verifiedCount / documentTypes.length) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Document Verification
            </CardTitle>
            <CardDescription>
              Verify borrower documents without storing them
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-lg font-bold">{verifiedCount}/{documentTypes.length}</p>
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {duplicateAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{duplicateAlert}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {documentTypes.map(docType => {
            const status = verificationStatuses[docType.id]
            return (
              <div
                key={docType.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getDocumentIcon(docType.id)}
                  <div>
                    <p className="font-medium">
                      {docType.label}
                      {docType.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {status.verifiedAt && (
                      <p className="text-xs text-muted-foreground">
                        Verified {new Date(status.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(status)}
                  
                  {status.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = docType.id.includes('id') ? 'image/*' : '.pdf'
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleFileSelect(file, docType.id)
                        }
                        input.click()
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  )}
                  
                  {status.status !== 'pending' && status.result && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCurrentType(docType.id)
                        setShowResults(true)
                      }}
                    >
                      Details
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* File selected for verification */}
        {currentFile && (
          <Alert>
            <FileCheck className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Ready to verify: {currentFile.name} ({(currentFile.size / 1024).toFixed(0)} KB)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentFile(null)
                    setCurrentType("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={verifyDocument}
                  disabled={verifying}
                >
                  {verifying ? "Verifying..." : "Verify Document"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Important Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacy Protection:</strong> Documents are verified in real-time and immediately deleted. 
            We only store verification results, never the actual documents.
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* Verification Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              Detailed results of document verification
            </DialogDescription>
          </DialogHeader>
          
          {currentType && verificationStatuses[currentType]?.result && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Document Information</h4>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Hash: {verificationStatuses[currentType].result.documentHash.substring(0, 16)}...
                  </p>
                  {verificationStatuses[currentType].result.details.institution && (
                    <p className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Institution: {verificationStatuses[currentType].result.details.institution}
                    </p>
                  )}
                  {verificationStatuses[currentType].result.details.documentDate && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date: {new Date(verificationStatuses[currentType].result.details.documentDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Verification Flags</h4>
                <div className="space-y-1">
                  {Object.entries(verificationStatuses[currentType].result.flags).map(([flag, value]) => (
                    <div key={flag} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{flag.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {verificationStatuses[currentType].result.details.suspiciousIndicators && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Suspicious Indicators</h4>
                  <ul className="space-y-1 text-sm">
                    {verificationStatuses[currentType].result.details.suspiciousIndicators.map((indicator, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}