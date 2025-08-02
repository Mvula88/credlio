"use client"

import { Badge } from "@/components/ui/badge"
import {
  Award,
  Crown,
  Medal,
  Shield,
  Star,
  Trophy,
  Zap,
  Target,
  Heart,
  CheckCircle2,
} from "lucide-react"

interface ReputationBadge {
  id: string
  badge_name: string
  badge_type: "bronze" | "silver" | "gold" | "platinum" | "special"
  description: string
  earned_at: string
  icon_name?: string
}

interface ReputationBadgesDisplayProps {
  badges: ReputationBadge[]
  maxBadges?: number
  showDescription?: boolean
  size?: "sm" | "md" | "lg"
}

export function ReputationBadgesDisplay({
  badges,
  maxBadges = 6,
  showDescription = false,
  size = "md",
}: ReputationBadgesDisplayProps) {
  const getBadgeIcon = (badgeName: string, iconName?: string) => {
    const iconClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"

    // Use custom icon if provided
    if (iconName) {
      switch (iconName.toLowerCase()) {
        case "crown":
          return <Crown className={iconClass} />
        case "trophy":
          return <Trophy className={iconClass} />
        case "medal":
          return <Medal className={iconClass} />
        case "shield":
          return <Shield className={iconClass} />
        case "star":
          return <Star className={iconClass} />
        case "zap":
          return <Zap className={iconClass} />
        case "target":
          return <Target className={iconClass} />
        case "heart":
          return <Heart className={iconClass} />
        case "check":
          return <CheckCircle2 className={iconClass} />
      }
    }

    // Fallback based on badge name
    switch (badgeName.toLowerCase()) {
      case "first_loan_completed":
      case "loan_completion_master":
        return <CheckCircle2 className={iconClass} />
      case "trusted_borrower":
      case "verified_identity":
        return <Shield className={iconClass} />
      case "top_rated_borrower":
      case "excellent_rating":
        return <Star className={iconClass} />
      case "quick_responder":
      case "fast_approval":
        return <Zap className={iconClass} />
      case "goal_achiever":
      case "milestone_reached":
        return <Target className={iconClass} />
      case "community_favorite":
      case "highly_recommended":
        return <Heart className={iconClass} />
      case "platinum_member":
      case "vip_status":
        return <Crown className={iconClass} />
      case "champion_borrower":
      case "elite_status":
        return <Trophy className={iconClass} />
      default:
        return <Award className={iconClass} />
    }
  }

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case "bronze":
        return "bg-amber-100 text-amber-800 border-amber-300"
      case "silver":
        return "bg-gray-100 text-gray-800 border-gray-300"
      case "gold":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "platinum":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "special":
        return "bg-gradient-to-r from-pink-100 to-purple-100 text-purple-800 border-purple-300"
      default:
        return "bg-blue-100 text-blue-800 border-blue-300"
    }
  }

  const formatBadgeName = (badgeName: string) => {
    return badgeName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const displayBadges = badges.slice(0, maxBadges)
  const remainingCount = badges.length - maxBadges

  if (badges.length === 0) {
    return <div className="text-sm text-muted-foreground">No reputation badges earned yet</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {displayBadges.map((badge) => (
          <div key={badge.id} className="group relative">
            <Badge
              variant="outline"
              className={`${getBadgeColor(badge.badge_type)} flex items-center gap-1 ${
                size === "sm"
                  ? "px-2 py-1 text-xs"
                  : size === "lg"
                    ? "px-3 py-2 text-sm"
                    : "px-2 py-1 text-xs"
              }`}
            >
              {getBadgeIcon(badge.badge_name, badge.icon_name)}
              <span className="font-medium">{formatBadgeName(badge.badge_name)}</span>
            </Badge>

            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="font-medium">{formatBadgeName(badge.badge_name)}</div>
              <div className="text-gray-300">{badge.description}</div>
              <div className="text-gray-400">Earned: {formatDate(badge.earned_at)}</div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-black"></div>
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <Badge variant="outline" className="bg-gray-50 text-xs text-gray-600">
            +{remainingCount} more
          </Badge>
        )}
      </div>

      {showDescription && (
        <div className="space-y-2">
          {displayBadges.map((badge) => (
            <div key={`desc-${badge.id}`} className="flex items-start gap-2 text-sm">
              <div className="flex items-center gap-1 font-medium text-gray-700">
                {getBadgeIcon(badge.badge_name, badge.icon_name)}
                {formatBadgeName(badge.badge_name)}
              </div>
              <div className="text-gray-600">{badge.description}</div>
              <div className="ml-auto text-xs text-gray-400">{formatDate(badge.earned_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper component for single badge display
export function ReputationBadge({ badge }: { badge: ReputationBadge }) {
  return <ReputationBadgesDisplay badges={[badge]} maxBadges={1} showDescription={true} />
}
