"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, CheckCircle } from "lucide-react"

interface StatsCardsProps {
  stats?: {
    totalLoans?: number
    activeLoans?: number
    totalAmount?: number
    averageInterestRate?: number
    repaymentRate?: number
    pendingApplications?: number
  }
  loading?: boolean
  userRole: "borrower" | "lender"
}

export function StatsCards({ stats, loading, userRole }: StatsCardsProps) {
  const cards = userRole === "borrower" 
    ? [
        {
          title: "Total Loans",
          value: stats?.totalLoans || 0,
          icon: FileText,
          format: "number",
        },
        {
          title: "Active Loans",
          value: stats?.activeLoans || 0,
          icon: Clock,
          format: "number",
        },
        {
          title: "Total Borrowed",
          value: stats?.totalAmount || 0,
          icon: DollarSign,
          format: "currency",
        },
        {
          title: "Repayment Rate",
          value: stats?.repaymentRate || 0,
          icon: CheckCircle,
          format: "percentage",
        },
      ]
    : [
        {
          title: "Total Loans",
          value: stats?.totalLoans || 0,
          icon: FileText,
          format: "number",
        },
        {
          title: "Active Loans",
          value: stats?.activeLoans || 0,
          icon: Clock,
          format: "number",
        },
        {
          title: "Total Funded",
          value: stats?.totalAmount || 0,
          icon: DollarSign,
          format: "currency",
        },
        {
          title: "Avg Interest Rate",
          value: stats?.averageInterestRate || 0,
          icon: TrendingUp,
          format: "percentage",
        },
      ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case "currency":
        return formatCurrency(value)
      case "percentage":
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-3 w-[80px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const isPositive = index === 3 && (card.value as number) > 50

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(card.value as number, card.format)}
              </div>
              {index === 3 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  {isPositive ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">Good standing</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">Needs improvement</span>
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}