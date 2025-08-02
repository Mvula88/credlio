"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Loader2,
} from "lucide-react"
import type { AffordabilityMetrics, BorrowerReputation } from "@/lib/types/bureau"

interface AffordabilityCalculatorProps {
  borrowerId: string
  onClose?: () => void
}

export function AffordabilityCalculator({ borrowerId, onClose }: AffordabilityCalculatorProps) {
  const [metrics, setMetrics] = useState<AffordabilityMetrics | null>(null)
  const [reputation, setReputation] = useState<BorrowerReputation | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    monthly_salary: 0,
    side_hustle_income: 0,
    remittances: 0,
    other_income: 0,
    monthly_expenses: 0,
    existing_loan_payments: 0,
  })
  const [results, setResults] = useState<{
    disposable_income: number
    debt_to_income_ratio: number
    risk_score: number
    max_affordable_loan: number
  } | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
  }, [borrowerId])

  async function fetchData() {
    try {
      // Fetch existing metrics
      const { data: metricsData } = await supabase
        .from("affordability_metrics")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      if (metricsData) {
        setMetrics(metricsData)
        setFormData({
          monthly_salary: metricsData.monthly_salary,
          side_hustle_income: metricsData.side_hustle_income,
          remittances: metricsData.remittances,
          other_income: metricsData.other_income,
          monthly_expenses: metricsData.monthly_expenses,
          existing_loan_payments: metricsData.existing_loan_payments,
        })
      }

      // Fetch reputation
      const { data: repData } = await supabase
        .from("borrower_reputation")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      setReputation(repData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCalculate() {
    setCalculating(true)
    try {
      // Update metrics in database
      const total_income =
        formData.monthly_salary +
        formData.side_hustle_income +
        formData.remittances +
        formData.other_income

      const disposable = total_income - formData.monthly_expenses - formData.existing_loan_payments

      const { data, error } = await supabase.from("affordability_metrics").upsert(
        {
          borrower_id: borrowerId,
          monthly_salary: formData.monthly_salary,
          side_hustle_income: formData.side_hustle_income,
          remittances: formData.remittances,
          other_income: formData.other_income,
          total_monthly_income: total_income,
          monthly_expenses: formData.monthly_expenses,
          existing_loan_payments: formData.existing_loan_payments,
          disposable_income: disposable,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "borrower_id",
        }
      )

      if (error) throw error

      // Call the calculation function
      const { data: calcResult } = await supabase.rpc("calculate_affordability_risk", {
        p_borrower_id: borrowerId,
      })

      if (calcResult && calcResult.length > 0) {
        setResults(calcResult[0])
      }
    } catch (error) {
      console.error("Error calculating:", error)
    } finally {
      setCalculating(false)
    }
  }

  const getRiskBadge = (score: number) => {
    if (score <= 30) {
      return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
    } else if (score <= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">High Risk</Badge>
    }
  }

  const getDTIStatus = (ratio: number) => {
    if (ratio <= 20) {
      return { color: "text-green-600", text: "Excellent" }
    } else if (ratio <= 35) {
      return { color: "text-blue-600", text: "Good" }
    } else if (ratio <= 50) {
      return { color: "text-yellow-600", text: "Fair" }
    } else {
      return { color: "text-red-600", text: "Poor" }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Borrower Info */}
      {reputation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Borrower Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reputation Score</p>
                <p className="text-xl font-bold">{reputation.reputation_score}/100</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge
                  className={
                    reputation.reputation_category === "GOOD"
                      ? "bg-green-100 text-green-800"
                      : reputation.reputation_category === "MODERATE"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }
                >
                  {reputation.reputation_category}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-xl font-bold">{reputation.active_loans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Income</CardTitle>
          <CardDescription>Enter all sources of monthly income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monthly Salary</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.monthly_salary}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Side Hustle Income</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.side_hustle_income}
                onChange={(e) =>
                  setFormData({ ...formData, side_hustle_income: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Remittances</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.remittances}
                onChange={(e) =>
                  setFormData({ ...formData, remittances: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Other Income</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.other_income}
                onChange={(e) =>
                  setFormData({ ...formData, other_income: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Expenses</CardTitle>
          <CardDescription>Enter regular monthly expenses and loan payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monthly Living Expenses</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.monthly_expenses}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_expenses: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Existing Loan Payments</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.existing_loan_payments}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    existing_loan_payments: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <Button onClick={handleCalculate} className="w-full" disabled={calculating}>
        {calculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Calculator className="mr-2 h-4 w-4" />
            Calculate Affordability
          </>
        )}
      </Button>

      {/* Results */}
      {results && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Affordability Assessment Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Disposable Income</p>
                <p className="flex items-center gap-2 text-2xl font-bold">
                  <DollarSign className="h-5 w-5" />
                  {results.disposable_income.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Debt-to-Income Ratio</p>
                <div>
                  <p
                    className={`text-2xl font-bold ${getDTIStatus(results.debt_to_income_ratio).color}`}
                  >
                    {results.debt_to_income_ratio.toFixed(1)}%
                  </p>
                  <p className={`text-sm ${getDTIStatus(results.debt_to_income_ratio).color}`}>
                    {getDTIStatus(results.debt_to_income_ratio).text}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Risk Assessment</p>
                {getRiskBadge(results.risk_score)}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Risk Score</span>
                  <span className="font-bold">{results.risk_score}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${
                      results.risk_score <= 30
                        ? "bg-green-500"
                        : results.risk_score <= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${results.risk_score}%` }}
                  />
                </div>
              </div>
            </div>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Maximum Affordable Loan:</strong> $
                {results.max_affordable_loan.toLocaleString()}
                <br />
                <span className="text-sm text-muted-foreground">
                  Based on 30% of disposable income over 12 months
                </span>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
