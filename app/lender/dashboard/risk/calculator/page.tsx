"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function RiskCalculatorPage() {
  const [loanAmount, setLoanAmount] = useState(1000)
  const [interestRate, setInterestRate] = useState(10)
  const [duration, setDuration] = useState(12)
  const [borrowerScore, setBorrowerScore] = useState(50)
  const [collateral, setCollateral] = useState(0)
  const [previousDefaults, setPreviousDefaults] = useState(0)

  const calculateRisk = () => {
    let riskScore = 0
    
    // Base risk from borrower score (0-40 points)
    riskScore += (100 - borrowerScore) * 0.4
    
    // Risk from loan-to-collateral ratio (0-30 points)
    const ltcRatio = collateral > 0 ? loanAmount / collateral : 1
    riskScore += Math.min(ltcRatio * 30, 30)
    
    // Risk from previous defaults (0-20 points)
    riskScore += Math.min(previousDefaults * 10, 20)
    
    // Risk from duration (0-10 points)
    riskScore += Math.min(duration / 60 * 10, 10)
    
    return Math.round(riskScore)
  }

  const riskScore = calculateRisk()
  const riskLevel = riskScore < 30 ? "Low" : riskScore < 60 ? "Medium" : "High"
  const riskColor = riskScore < 30 ? "green" : riskScore < 60 ? "yellow" : "red"
  
  const monthlyPayment = (loanAmount * (1 + interestRate / 100)) / duration
  const totalRepayment = loanAmount * (1 + interestRate / 100)
  const profit = totalRepayment - loanAmount

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk Calculator</h1>
        <p className="text-muted-foreground">Calculate lending risk and potential returns</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Parameters</CardTitle>
            <CardDescription>Enter loan details to calculate risk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Loan Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                min="100"
                max="100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">Interest Rate (%)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="interest"
                  value={[interestRate]}
                  onValueChange={(v) => setInterestRate(v[0])}
                  min={0}
                  max={50}
                  step={0.5}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">{interestRate}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (months)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="duration"
                  value={[duration]}
                  onValueChange={(v) => setDuration(v[0])}
                  min={1}
                  max={60}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">{duration}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Borrower Reputation Score</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="score"
                  value={[borrowerScore]}
                  onValueChange={(v) => setBorrowerScore(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-right font-medium">{borrowerScore}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collateral">Collateral Value ($)</Label>
              <Input
                id="collateral"
                type="number"
                value={collateral}
                onChange={(e) => setCollateral(Number(e.target.value))}
                min="0"
                max="1000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaults">Previous Defaults</Label>
              <Input
                id="defaults"
                type="number"
                value={previousDefaults}
                onChange={(e) => setPreviousDefaults(Number(e.target.value))}
                min="0"
                max="10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-5xl font-bold mb-2">{riskScore}%</div>
                <Badge 
                  variant={riskLevel === "Low" ? "default" : riskLevel === "Medium" ? "secondary" : "destructive"}
                  className="text-lg px-4 py-1"
                >
                  {riskLevel} Risk
                </Badge>
              </div>

              {riskLevel === "High" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This loan has high risk indicators. Consider requiring additional collateral or reducing the loan amount.
                  </AlertDescription>
                </Alert>
              )}

              {riskLevel === "Low" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    This loan appears to have low risk. Good candidate for approval.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Factors:</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Borrower Score Risk</span>
                    <span>{((100 - borrowerScore) * 0.4).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collateral Risk</span>
                    <span>{Math.min((collateral > 0 ? loanAmount / collateral : 1) * 30, 30).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Default History Risk</span>
                    <span>{Math.min(previousDefaults * 10, 20)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration Risk</span>
                    <span>{Math.min(duration / 60 * 10, 10).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Projections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Payment</span>
                  <span className="font-semibold">${monthlyPayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Repayment</span>
                  <span className="font-semibold">${totalRepayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Earned</span>
                  <span className="font-semibold text-green-600">${profit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROI</span>
                  <span className="font-semibold">{interestRate}%</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-muted-foreground">Risk-Adjusted Return</span>
                  <span className="font-semibold">
                    {(interestRate * (100 - riskScore) / 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}