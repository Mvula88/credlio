"use client"

import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Shield,
  Star,
  Zap,
  Target,
} from "lucide-react"

interface SmartTag {
  id: string
  tag_name: string
  tag_type: "positive" | "negative" | "neutral" | "warning"
  description?: string
  created_at: string
}

interface SmartTagsDisplayProps {
  tags: SmartTag[]
  maxTags?: number
  showDescription?: boolean
}

export function SmartTagsDisplay({
  tags,
  maxTags = 5,
  showDescription = false,
}: SmartTagsDisplayProps) {
  const getTagIcon = (tagName: string, tagType: string) => {
    const iconClass = "h-3 w-3"

    // Specific tag icons
    switch (tagName.toLowerCase()) {
      case "reliable_payer":
      case "excellent_credit":
        return <CheckCircle className={iconClass} />
      case "late_payment":
      case "missed_payment":
        return <AlertTriangle className={iconClass} />
      case "high_earner":
      case "stable_income":
        return <DollarSign className={iconClass} />
      case "improving_credit":
        return <TrendingUp className={iconClass} />
      case "declining_credit":
        return <TrendingDown className={iconClass} />
      case "verified_identity":
        return <Shield className={iconClass} />
      case "frequent_borrower":
        return <Clock className={iconClass} />
      case "top_rated":
        return <Star className={iconClass} />
      case "quick_responder":
        return <Zap className={iconClass} />
      case "goal_oriented":
        return <Target className={iconClass} />
      default:
        // Fallback based on type
        switch (tagType) {
          case "positive":
            return <CheckCircle className={iconClass} />
          case "negative":
            return <AlertTriangle className={iconClass} />
          case "warning":
            return <AlertTriangle className={iconClass} />
          default:
            return <Clock className={iconClass} />
        }
    }
  }

  const getTagVariant = (tagType: string) => {
    switch (tagType) {
      case "positive":
        return "default" // Green
      case "negative":
        return "destructive" // Red
      case "warning":
        return "secondary" // Yellow/Orange
      case "neutral":
      default:
        return "outline" // Gray
    }
  }

  const getTagColor = (tagType: string) => {
    switch (tagType) {
      case "positive":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "negative":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "neutral":
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const formatTagName = (tagName: string) => {
    return tagName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const displayTags = tags.slice(0, maxTags)
  const remainingCount = tags.length - maxTags

  if (tags.length === 0) {
    return <div className="text-sm text-muted-foreground">No smart tags available</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={getTagVariant(tag.tag_type)}
            className={`${getTagColor(tag.tag_type)} flex items-center gap-1`}
            title={showDescription ? tag.description : undefined}
          >
            {getTagIcon(tag.tag_name, tag.tag_type)}
            <span className="text-xs font-medium">{formatTagName(tag.tag_name)}</span>
          </Badge>
        ))}

        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>

      {showDescription && displayTags.some((tag) => tag.description) && (
        <div className="space-y-1">
          {displayTags
            .filter((tag) => tag.description)
            .map((tag) => (
              <div key={`desc-${tag.id}`} className="text-xs text-muted-foreground">
                <span className="font-medium">{formatTagName(tag.tag_name)}:</span>{" "}
                {tag.description}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// Helper component for single tag display
export function SmartTag({ tag }: { tag: SmartTag }) {
  return <SmartTagsDisplay tags={[tag]} maxTags={1} showDescription={true} />
}
