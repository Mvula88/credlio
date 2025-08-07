"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BorrowerRiskBadgeProps {
  borrowerId?: string
  email?: string
  showDetails?: boolean
  className?: string
}

export function BorrowerRiskBadge({ 
  borrowerId,
  email, 
  showDetails = true,
  className = "" 
}: BorrowerRiskBadgeProps) {
  const [riskData, setRiskData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (borrowerId || email) {
      checkRisk()
    }
  }, [borrowerId, email])

  const checkRisk = async () => {
    try {
      const params = new URLSearchParams()
      if (borrowerId) params.append('id', borrowerId)
      if (email) params.append('email', email)
      
      const response = await fetch(`/api/borrowers/risk-check?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRiskData(data)
      }
    } catch (error) {
      console.error("Failed to check risk:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (!riskData || riskData.total_reports === 0) {
    return null
  }

  const getRiskLevel = () => {
    if (riskData.reporting_lenders >= 3) return "extreme"
    if (riskData.reporting_lenders >= 2) return "high"
    if (riskData.total_reports > 0) return "moderate"
    return "low"
  }

  const riskLevel = getRiskLevel()

  const badgeConfig = {
    extreme: {
      color: "bg-red-600 text-white border-red-700",
      icon: <AlertTriangle className="w-3 h-3" />,
      text: `⚠️ RISKY - Listed by ${riskData.reporting_lenders} lenders`
    },
    high: {
      color: "bg-orange-500 text-white border-orange-600",
      icon: <AlertTriangle className="w-3 h-3" />,
      text: `⚠️ RISKY - Listed by ${riskData.reporting_lenders} lenders`
    },
    moderate: {
      color: "bg-yellow-500 text-white border-yellow-600",
      icon: <Info className="w-3 h-3" />,
      text: `⚠️ RISKY - Listed by 1 lender`
    },
    low: {
      color: "bg-gray-500 text-white border-gray-600",
      icon: <Shield className="w-3 h-3" />,
      text: "Low Risk"
    }
  }

  const config = badgeConfig[riskLevel as keyof typeof badgeConfig]

  if (!showDetails) {
    return (
      <Badge className={`${config.color} ${className}`}>
        {config.text}
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.color} cursor-help ${className}`}>
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Risk Details:</p>
            <ul className="text-sm space-y-1">
              <li>• Risk Score: {riskData.risk_score}/100</li>
              <li>• Total Reports: {riskData.total_reports}</li>
              <li>• Reporting Lenders: {riskData.reporting_lenders}</li>
              {riskData.system_flagged && (
                <li>• System Auto-Flagged</li>
              )}
              {riskData.total_amount_owed > 0 && (
                <li>• Total Owed: ${riskData.total_amount_owed.toLocaleString()}</li>
              )}
            </ul>
            {riskData.report_reasons && riskData.report_reasons.length > 0 && (
              <div>
                <p className="font-semibold mt-2">Reasons:</p>
                <ul className="text-sm">
                  {riskData.report_reasons.map((reason: string, idx: number) => (
                    <li key={idx}>• {reason.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Inline risk indicator (smaller, for use in tables/lists)
export function BorrowerRiskIndicator({ email }: { email: string }) {
  const [riskData, setRiskData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/borrowers/risk-check?email=${encodeURIComponent(email)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setRiskData(data))
      .catch(() => {})
  }, [email])

  if (!riskData || riskData.total_reports === 0) {
    return null
  }

  const getColor = () => {
    if (riskData.reporting_lenders >= 3) return "text-red-600"
    if (riskData.reporting_lenders >= 2) return "text-orange-500"
    return "text-yellow-500"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center ${getColor()} cursor-help`}>
            <AlertTriangle className="w-4 h-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            ⚠️ Risky Borrower - Listed by {riskData.reporting_lenders} {
              riskData.reporting_lenders === 1 ? 'lender' : 'lenders'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}