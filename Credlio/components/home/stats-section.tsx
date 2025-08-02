"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, DollarSign, Globe, TrendingUp } from "lucide-react"

interface PlatformStats {
  totalUsers: number
  totalLoansTracked: number
  totalCountries: number
  successRate: number
}

export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats?public=true")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toString()
  }

  const formatCurrency = (num: number): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(0)}M`
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`
    }
    return `$${num}`
  }

  const statItems = [
    {
      icon: Users,
      label: "Active Users",
      value: stats?.totalUsers || 0,
      formatter: formatNumber,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: DollarSign,
      label: "Loans Tracked",
      value: stats?.totalLoansTracked || 0,
      formatter: formatCurrency,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Globe,
      label: "Countries",
      value: stats?.totalCountries || 0,
      formatter: (n: number) => n.toString(),
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: TrendingUp,
      label: "Success Rate",
      value: stats?.successRate || 0,
      formatter: (n: number) => `${n}%`,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <section className="border-y bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {statItems.map((item, index) => (
            <Card key={index} className="border-none bg-transparent shadow-none">
              <div className="flex flex-col items-center text-center">
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${item.bgColor}`}>
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                {loading ? (
                  <>
                    <Skeleton className="mb-2 h-10 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-gray-900">
                      {item.formatter(item.value)}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-600">{item.label}</div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}