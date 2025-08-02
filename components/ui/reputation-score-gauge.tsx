"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Zap,
} from "lucide-react"

interface ReputationScoreGaugeProps {
  score: number
  category: "GOOD" | "MODERATE" | "BAD"
  previousScore?: number
  isBlacklisted?: boolean
  loading?: boolean
}

export function ReputationScoreGauge({
  score,
  category,
  previousScore,
  isBlacklisted = false,
  loading = false,
}: ReputationScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    if (!loading) {
      // Animate score
      const timer = setTimeout(() => {
        setDisplayScore(score)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [score, loading])

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-green-600"
    if (score >= 40) return "bg-yellow-600"
    return "bg-red-600"
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "GOOD":
        return (
          <Badge variant="default" className="border-green-200 bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Good Standing
          </Badge>
        )
      case "MODERATE":
        return (
          <Badge variant="default" className="border-yellow-200 bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Moderate Risk
          </Badge>
        )
      case "BAD":
        return (
          <Badge variant="default" className="border-red-200 bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            High Risk
          </Badge>
        )
    }
  }

  const getTrend = () => {
    if (!previousScore) return null
    const diff = score - previousScore
    if (Math.abs(diff) < 1) return null

    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{diff.toFixed(0)}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">{diff.toFixed(0)}</span>
        </div>
      )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reputation Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="mb-4 h-32 rounded-lg bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      {isBlacklisted && <div className="pointer-events-none absolute inset-0 bg-red-50/50" />}

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reputation Score</CardTitle>
          {getTrend()}
        </div>
        <CardDescription>Based on your payment history and lending behavior</CardDescription>
      </CardHeader>

      <CardContent>
        {isBlacklisted && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-100 p-3">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Account Blacklisted</span>
            </div>
          </div>
        )}

        <div className="mb-6 text-center">
          <div
            className={`text-6xl font-bold transition-all duration-1000 ${getScoreColor(displayScore)}`}
          >
            {displayScore}
          </div>
          <div className="mt-1 text-sm text-gray-500">out of 100</div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Progress value={displayScore} className="h-3 transition-all duration-1000" />
            <div
              className={`absolute inset-0 h-3 rounded-full ${getProgressColor(displayScore)} transition-all duration-1000`}
              style={{ width: `${displayScore}%` }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
            <span>100</span>
          </div>
        </div>

        <div className="flex items-center justify-center">{getCategoryBadge(category)}</div>

        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 text-gray-500" />
            <div className="text-sm text-gray-600">
              {score >= 70 ? (
                <span>Excellent! Keep maintaining timely payments to stay in good standing.</span>
              ) : score >= 40 ? (
                <span>
                  Your score needs improvement. Focus on timely repayments to boost your rating.
                </span>
              ) : (
                <span>
                  Your score is low. Consistent on-time payments will help improve your reputation.
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MiniReputationScoreProps {
  score: number
  category: "GOOD" | "MODERATE" | "BAD"
  size?: "sm" | "md" | "lg"
}

export function MiniReputationScore({ score, category, size = "md" }: MiniReputationScoreProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  const getScoreColor = (category: string) => {
    switch (category) {
      case "GOOD":
        return "text-green-600"
      case "MODERATE":
        return "text-yellow-600"
      case "BAD":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getIcon = () => {
    switch (category) {
      case "GOOD":
        return <Zap className="h-4 w-4 text-green-600" />
      case "MODERATE":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "BAD":
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <span className={`${sizeClasses[size]} font-bold ${getScoreColor(category)}`}>{score}</span>
      <span className="text-sm text-gray-500">/100</span>
    </div>
  )
}
