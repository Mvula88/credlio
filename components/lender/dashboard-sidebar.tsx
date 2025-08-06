"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Users,
  Search,
  Store,
  DollarSign,
  Shield,
  FileText,
  BarChart3,
  Bell,
  Settings,
  UserPlus,
  Calculator,
  AlertTriangle,
  CreditCard,
  Menu,
  X,
  ChevronRight,
  Home,
  TrendingUp,
  Clock,
  UserCheck,
  FileSearch,
  Building2,
  MessageSquare,
  HelpCircle,
  LogOut
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
  requiresPremium?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/lender/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Loan Management",
    href: "/lender/dashboard/loans",
    icon: DollarSign,
    children: [
      {
        title: "Active Loans",
        href: "/lender/dashboard/loans/active",
        icon: Clock,
      },
      {
        title: "Loan Requests",
        href: "/lender/dashboard/loans/requests",
        icon: FileText,
      },
      {
        title: "Repayments",
        href: "/lender/dashboard/loans/repayments",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Borrowers",
    href: "/lender/dashboard/borrowers",
    icon: Users,
    children: [
      {
        title: "My Borrowers",
        href: "/lender/dashboard/borrowers/my-borrowers",
        icon: UserCheck,
      },
      {
        title: "Search Borrowers",
        href: "/lender/dashboard/borrowers/search",
        icon: Search,
      },
      {
        title: "Invite Borrower",
        href: "/lender/dashboard/borrowers/invite",
        icon: UserPlus,
      },
    ],
  },
  {
    title: "Marketplace",
    href: "/lender/dashboard/marketplace",
    icon: Store,
    badge: "Premium",
    requiresPremium: true,
  },
  {
    title: "Risk Management",
    href: "/lender/dashboard/risk",
    icon: Shield,
    children: [
      {
        title: "Risk Dashboard",
        href: "/lender/dashboard/risk/overview",
        icon: AlertTriangle,
      },
      {
        title: "Blacklist",
        href: "/lender/dashboard/risk/blacklist",
        icon: Users,
      },
      {
        title: "Ghost Borrowers",
        href: "/lender/dashboard/risk/ghost",
        icon: Users,
      },
      {
        title: "Risk Calculator",
        href: "/lender/dashboard/risk/calculator",
        icon: Calculator,
      },
    ],
  },
  {
    title: "Reports & Analytics",
    href: "/lender/dashboard/reports",
    icon: BarChart3,
    children: [
      {
        title: "Credit Reports",
        href: "/lender/dashboard/reports/credit",
        icon: FileSearch,
      },
      {
        title: "Portfolio Analytics",
        href: "/lender/dashboard/reports/portfolio",
        icon: BarChart3,
      },
      {
        title: "Performance Metrics",
        href: "/lender/dashboard/reports/metrics",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Payments",
    href: "/lender/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "Messages",
    href: "/lender/dashboard/messages",
    icon: MessageSquare,
    badge: "3",
  },
  {
    title: "Notifications",
    href: "/lender/dashboard/notifications",
    icon: Bell,
    badge: "5",
  },
  {
    title: "Settings",
    href: "/lender/dashboard/settings",
    icon: Settings,
  },
]

interface LenderDashboardSidebarProps {
  profile: any
  hasActiveSubscription: boolean
  subscriptionTier: number
}

export function LenderDashboardSidebar({
  profile,
  hasActiveSubscription,
  subscriptionTier,
}: LenderDashboardSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === "/lender/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon
    const active = isActive(item.href)
    const expanded = expandedItems.includes(item.title)
    const disabled = item.disabled || (item.requiresPremium && subscriptionTier < 2)

    if (item.children) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
              active && "bg-green-50 text-green-700",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
          {expanded && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={disabled ? "#" : item.href}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-green-50 text-green-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          disabled && "cursor-not-allowed opacity-50",
          level > 0 && "ml-4"
        )}
        onClick={(e) => {
          if (disabled) e.preventDefault()
          setIsMobileOpen(false)
        }}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </div>
        {item.badge && (
          <Badge 
            variant={item.requiresPremium ? "secondary" : "default"}
            className="ml-auto"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-4 py-5">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Credlio</h2>
                <p className="text-xs text-gray-500">Lender Dashboard</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                {profile.full_name?.charAt(0) || "L"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name || "Lender"}
                </p>
                <p className="text-xs text-gray-500">
                  {hasActiveSubscription ? (
                    <span className="text-green-600">
                      {subscriptionTier >= 2 ? "Premium" : "Basic"} Plan
                    </span>
                  ) : (
                    <span className="text-amber-600">No Active Plan</span>
                  )}
                </p>
              </div>
            </div>
            {!hasActiveSubscription && (
              <Link href="/lender/subscribe">
                <Button size="sm" className="mt-3 w-full">
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map(item => renderNavItem(item))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-4 py-4">
            <div className="space-y-2">
              <Link
                href="/help"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <HelpCircle className="h-4 w-4" />
                Help & Support
              </Link>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                onClick={() => {
                  // Handle logout
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}