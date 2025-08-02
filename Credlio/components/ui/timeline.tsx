import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TimelineItem {
  id: string
  title: string
  description: string
  date: string
  status?: "completed" | "current" | "upcoming" | "overdue"
  amount?: number
  icon?: ReactNode
  badge?: {
    text: string
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
}

interface TimelineProps {
  items: TimelineItem[]
  variant?: "default" | "compact"
}

export function Timeline({ items, variant = "default" }: TimelineProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          dotColor: "bg-green-500",
          lineColor: "border-green-200",
          bgColor: "bg-green-50",
        }
      case "current":
        return {
          dotColor: "bg-blue-500",
          lineColor: "border-blue-200",
          bgColor: "bg-blue-50",
        }
      case "overdue":
        return {
          dotColor: "bg-red-500",
          lineColor: "border-red-200",
          bgColor: "bg-red-50",
        }
      case "upcoming":
      default:
        return {
          dotColor: "bg-gray-300",
          lineColor: "border-gray-200",
          bgColor: "bg-gray-50",
        }
    }
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {items.map((item, index) => {
          const { dotColor, bgColor } = getStatusConfig(item.status || "upcoming")

          return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className={cn("h-3 w-3 flex-shrink-0 rounded-full", dotColor)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {item.amount && (
                      <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                    )}
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="text-xs">
                        {item.badge.text}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-600">{formatDate(item.date)}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative">
      {items.map((item, index) => {
        const { dotColor, lineColor, bgColor } = getStatusConfig(item.status || "upcoming")
        const isLast = index === items.length - 1

        return (
          <div key={item.id} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 h-full w-0.5 border-l-2 border-dashed",
                  lineColor
                )}
              />
            )}

            {/* Timeline item */}
            <div className="flex gap-4 pb-8 last:pb-0">
              {/* Dot and icon */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm",
                    dotColor
                  )}
                >
                  {item.icon ? (
                    <div className="text-xs text-white">{item.icon}</div>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className={cn("rounded-lg border p-4", bgColor)}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                      {item.amount && (
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </span>
                      )}
                      {item.badge && <Badge variant={item.badge.variant}>{item.badge.text}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{formatDate(item.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
