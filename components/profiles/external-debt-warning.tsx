"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  AlertTriangle, 
  Ban,
  DollarSign,
  Users,
  ExternalLink,
  XCircle
} from "lucide-react"

interface ExternalDebtWarningProps {
  borrowerName: string
  totalOwed: number
  reportingLenders: number
  externalDebts: number
  className?: string
}

export function ExternalDebtWarning({
  borrowerName,
  totalOwed,
  reportingLenders,
  externalDebts,
  className = ""
}: ExternalDebtWarningProps) {
  if (externalDebts === 0) return null

  return (
    <Alert className={`border-red-500 bg-red-50 ${className}`}>
      <Ban className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-900 font-bold">
        ⚠️ BORROWER OWES MONEY TO LENDER(S) OUTSIDE THE PLATFORM
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-red-800">
          This borrower has been reported for <strong>{externalDebts} debt{externalDebts > 1 ? 's' : ''}</strong> incurred 
          outside of this platform. They were listed on the risky borrowers list before creating an account here.
        </p>
        <div className="flex flex-wrap gap-3 mt-3">
          <Badge variant="destructive" className="text-sm">
            <DollarSign className="w-4 h-4 mr-1" />
            Total Owed: ${totalOwed.toLocaleString()}
          </Badge>
          <Badge variant="destructive" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            Reported by {reportingLenders} Lender{reportingLenders > 1 ? 's' : ''}
          </Badge>
          <Badge variant="destructive" className="text-sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            {externalDebts} External Debt{externalDebts > 1 ? 's' : ''}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Component for profile view
export function BorrowerRiskStatusCard({ 
  status,
  showDetails = true 
}: { 
  status: any
  showDetails?: boolean 
}) {
  if (!status || status.total_reports === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">Clear Status</p>
              <p className="text-sm text-green-700">No outstanding debts reported</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const riskLevel = status.total_reports >= 3 ? 'extreme' : 
                    status.total_reports >= 2 ? 'high' : 'moderate'
  
  const riskColors = {
    extreme: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    moderate: 'border-yellow-500 bg-yellow-50'
  }

  const iconColors = {
    extreme: 'bg-red-100 text-red-600',
    high: 'bg-orange-100 text-orange-600',
    moderate: 'bg-yellow-100 text-yellow-600'
  }

  return (
    <Card className={riskColors[riskLevel]}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${iconColors[riskLevel]}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">
                ⚠️ RISKY/BAD BORROWER
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {status.risk_status}
              </p>
            </div>
          </div>

          {showDetails && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Total Reports</p>
                  <p className="font-bold text-lg">{status.total_reports}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Reporting Lenders</p>
                  <p className="font-bold text-lg">{status.reporting_lenders}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Total Owed</p>
                  <p className="font-bold text-lg text-red-600">
                    ${(status.total_owed || 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">External Debts</p>
                  <p className="font-bold text-lg">
                    {status.external_debts || 0}
                  </p>
                </div>
              </div>

              {status.external_debt_warning && (
                <Alert className="bg-red-100 border-red-300">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 font-semibold">
                    {status.external_debt_warning}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Inline badge for lists/tables
export function RiskStatusBadge({ status }: { status: any }) {
  if (!status || status.total_reports === 0) {
    return null
  }

  const hasExternalDebt = status.external_debts > 0

  return (
    <div className="flex gap-2">
      <Badge variant="destructive">
        ⚠️ RISKY - {status.reporting_lenders} Lender{status.reporting_lenders > 1 ? 's' : ''}
      </Badge>
      {hasExternalDebt && (
        <Badge variant="outline" className="border-red-500 text-red-700">
          <ExternalLink className="w-3 h-3 mr-1" />
          External Debt
        </Badge>
      )}
    </div>
  )
}