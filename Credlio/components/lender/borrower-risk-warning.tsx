"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Ban, 
  Ghost, 
  Users, 
  ChevronDown,
  ChevronUp,
  Shield,
  Info
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface RiskSummary {
  risk_type: string
  report_count: number
  last_reported: string
}

interface BorrowerRiskWarningProps {
  borrowerName: string
  borrowerPhone?: string
  borrowerEmail?: string
  countryCode: string
  onProceed?: () => void
  onCancel?: () => void
}

export function BorrowerRiskWarning({ 
  borrowerName, 
  borrowerPhone, 
  borrowerEmail,
  countryCode,
  onProceed,
  onCancel
}: BorrowerRiskWarningProps) {
  const [riskData, setRiskData] = useState<RiskSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkBorrowerRisk()
  }, [borrowerName, borrowerPhone])

  async function checkBorrowerRisk() {
    try {
      // Check by name and phone
      const { data, error } = await supabase.rpc("get_person_risk_summary", {
        p_full_name: borrowerName,
        p_phone_number: borrowerPhone || null,
        p_country_code: countryCode
      })

      if (error) throw error
      setRiskData(data || [])
    } catch (error) {
      console.error("Error checking borrower risk:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || riskData.length === 0) return null

  const totalReports = riskData.reduce((sum, risk) => sum + risk.report_count, 0)
  const riskLevel = totalReports > 5 ? "high" : totalReports > 2 ? "medium" : "low"

  const getRiskIcon = (type: string) => {
    switch (type) {
      case "blacklisted": return <Ban className="h-4 w-4" />
      case "risky": return <AlertTriangle className="h-4 w-4" />
      case "off_platform": return <Users className="h-4 w-4" />
      case "ghost_defaulted": return <Ghost className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  const getRiskLabel = (type: string) => {
    switch (type) {
      case "blacklisted": return "Blacklisted"
      case "risky": return "Marked as Risky"
      case "off_platform": return "Off-Platform Defaulter"
      case "ghost_defaulted": return "Ghost Loan Default"
      default: return type
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Alert className={`
      ${riskLevel === "high" ? "border-red-500 bg-red-50" : 
        riskLevel === "medium" ? "border-orange-500 bg-orange-50" : 
        "border-yellow-500 bg-yellow-50"}
    `}>
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="flex items-center justify-between">
        <span className="font-semibold">
          Risk Warning: This borrower has been reported {totalReports} time{totalReports > 1 ? 's' : ''}
        </span>
        {riskLevel === "high" && (
          <Badge variant="destructive" className="ml-2">High Risk</Badge>
        )}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-3">
          <p className="text-sm">
            {borrowerName} has been flagged by other lenders. Review the details before proceeding.
          </p>

          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Info className="mr-2 h-4 w-4" />
                {isOpen ? "Hide" : "Show"} Risk Details
                {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2 rounded-md border bg-white p-3">
                {riskData.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(risk.risk_type)}
                      <span className="text-sm font-medium">{getRiskLabel(risk.risk_type)}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {risk.report_count} report{risk.report_count > 1 ? 's' : ''}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last: {formatDate(risk.last_reported)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {onProceed && onCancel && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant={riskLevel === "high" ? "destructive" : "default"}
                size="sm" 
                onClick={onProceed}
                className="flex-1"
              >
                Proceed Anyway
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}