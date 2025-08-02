"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  FileCheck,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

interface VerificationBadgeProps {
  borrowerId: string
  loanRequestId: string
  verificationStatus: {
    total: number
    verified: number
    failed: number
    pending: number
  }
  compact?: boolean
}

export function VerificationBadge({ 
  borrowerId, 
  loanRequestId, 
  verificationStatus,
  compact = false
}: VerificationBadgeProps) {
  const { total, verified, failed, pending } = verificationStatus
  const isComplete = verified === total
  const hasFailed = failed > 0
  const isPartial = verified > 0 && verified < total

  // Determine badge variant and icon
  const getBadgeVariant = () => {
    if (isComplete) return "default"
    if (hasFailed) return "destructive"
    if (isPartial) return "secondary"
    return "outline"
  }

  const getIcon = () => {
    if (isComplete) return <CheckCircle className="h-4 w-4" />
    if (hasFailed) return <XCircle className="h-4 w-4" />
    if (isPartial) return <AlertCircle className="h-4 w-4" />
    return <FileCheck className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (isComplete) return "Verified"
    if (hasFailed) return `${failed} Failed`
    if (pending > 0) return `${pending} Pending`
    return "Not Started"
  }

  if (compact) {
    return (
      <Link href={`/lender/verify/${loanRequestId}`}>
        <Badge 
          variant={getBadgeVariant()} 
          className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {getIcon()}
          <span>{verified}/{total}</span>
        </Badge>
      </Link>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <p className="text-sm font-medium">Document Verification</p>
          <p className="text-xs text-muted-foreground">
            {getStatusText()} • {verified} of {total} documents verified
          </p>
        </div>
      </div>
      
      <Link href={`/lender/verify/${loanRequestId}`}>
        <Button size="sm" variant={isComplete ? "outline" : "default"}>
          {isComplete ? "Review" : "Verify"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
  )
}