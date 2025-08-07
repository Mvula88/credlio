"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface BorrowerRisk {
  is_risky: boolean
  risk_level: "low" | "moderate" | "high" | "extreme"
  report_count: number
  reporting_lenders: number
  risk_score: number
  message: string | null
  reports?: any[]
}

export function useBorrowerRisk(borrowerId?: string | null, borrowerEmail?: string | null) {
  const [risk, setRisk] = useState<BorrowerRisk | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!borrowerId && !borrowerEmail) {
      setRisk(null)
      return
    }

    checkBorrowerRisk()
  }, [borrowerId, borrowerEmail])

  const checkBorrowerRisk = async () => {
    if (!borrowerId && !borrowerEmail) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/borrowers/risk-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ borrowerId, borrowerEmail }),
      })

      if (!response.ok) {
        throw new Error("Failed to check borrower risk")
      }

      const data = await response.json()
      setRisk(data)
    } catch (err) {
      console.error("Risk check error:", err)
      setError(err instanceof Error ? err.message : "Failed to check risk")
      setRisk(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    risk,
    loading,
    error,
    refetch: checkBorrowerRisk,
  }
}

// Component to display risk warning
export function BorrowerRiskWarning({ email }: { email: string }) {
  const { risk, loading } = useBorrowerRisk(email)

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
    )
  }

  if (!risk || !risk.is_risky) {
    return null
  }

  const getBadgeColor = () => {
    switch (risk.risk_level) {
      case "extreme":
        return "bg-red-600 text-white"
      case "high":
        return "bg-orange-500 text-white"
      case "moderate":
        return "bg-yellow-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <div className="space-y-2">
      {/* Main Warning Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getBadgeColor()}`}>
        ⚠️ {risk.message || "RISKY BORROWER"}
      </div>

      {/* Detailed Warning Box */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-red-900 text-sm">
              Risk Assessment Warning
            </p>
            <ul className="mt-1 text-xs text-red-700 space-y-1">
              <li>• Risk Score: {risk.risk_score}/100</li>
              <li>• Total Reports: {risk.report_count}</li>
              <li>• Reporting Lenders: {risk.reporting_lenders}</li>
              <li>• Risk Level: {risk.risk_level.toUpperCase()}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}