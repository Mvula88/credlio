import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ChartData {
  label: string
  value: number
  color?: string
  percentage?: number
}

interface SimpleChartProps {
  title: string
  description?: string
  data: ChartData[]
  type: "bar" | "pie" | "area"
  className?: string
  badge?: {
    text: string
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
}

export function SimpleChart({
  title,
  description,
  data,
  type,
  className,
  badge,
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))
  const total = data.reduce((sum, d) => sum + d.value, 0)

  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
    "#84cc16", // lime
  ]

  const renderBarChart = () => (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                backgroundColor: item.color || colors[index % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  const renderPieChart = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          const color = item.color || colors[index % colors.length]
          return (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-sm"
              style={{ backgroundColor: `${color}08` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-4 w-4 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{item.value.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderAreaChart = () => (
    <div className="space-y-4">
      {/* Simple area representation */}
      <div className="flex h-40 items-end justify-between gap-2 rounded-lg border bg-gradient-to-t from-blue-50 to-transparent p-4">
        {data.map((item, index) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const color = item.color || colors[index % colors.length]
          return (
            <div key={index} className="group flex flex-1 flex-col items-center gap-2">
              <div className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.value.toLocaleString()}
              </div>
              <div
                className="w-full rounded-t-md shadow-sm transition-all duration-700 ease-out"
                style={{
                  height: `${height}%`,
                  backgroundColor: color,
                  minHeight: height > 0 ? "8px" : "2px",
                }}
              />
              <span className="max-w-full truncate text-center text-xs leading-tight text-muted-foreground">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {data.map((item, index) => {
          const color = item.color || colors[index % colors.length]
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-medium">{item.value.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderChart = () => {
    if (!data.length) {
      return (
        <div className="flex h-40 flex-col items-center justify-center space-y-2 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <div className="h-8 w-8 rounded bg-gray-200"></div>
          </div>
          <p className="text-sm">No data available</p>
        </div>
      )
    }

    switch (type) {
      case "bar":
        return renderBarChart()
      case "pie":
        return renderPieChart()
      case "area":
        return renderAreaChart()
      default:
        return renderBarChart()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label: string
    direction: "up" | "down" | "flat"
  }
  icon?: ReactNode
  colorScheme?: "blue" | "green" | "yellow" | "red" | "purple" | "gray"
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  colorScheme = "blue",
}: MetricCardProps) {
  const getTrendColor = (direction: string) => {
    switch (direction) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up":
        return "↗"
      case "down":
        return "↘"
      default:
        return "→"
    }
  }

  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case "green":
        return { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" }
      case "yellow":
        return { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" }
      case "red":
        return { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" }
      case "purple":
        return { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" }
      case "gray":
        return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
      default:
        return { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" }
    }
  }

  const colors = getColorClasses(colorScheme)

  return (
    <Card
      className={`border-2 transition-all duration-200 hover:shadow-md ${colors.border} hover:${colors.border}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-sm ${getTrendColor(trend.direction)}`}>
                <span className="font-mono">{getTrendIcon(trend.direction)}</span>
                <span className="font-medium">
                  {Math.abs(trend.value)}% {trend.label}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={`rounded-xl p-3 ${colors.bg} ${colors.text} shadow-sm`}>{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
