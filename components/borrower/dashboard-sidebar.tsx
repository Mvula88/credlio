"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  User,
  Bell,
  Settings,
  Plus,
  History,
  CreditCard,
  Shield,
  Upload,
  MessageSquare,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  Calendar,
  Star,
  Award
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/borrower/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Loan Requests",
    href: "/borrower/dashboard/requests",
    icon: FileText,
    children: [
      {
        title: "My Requests",
        href: "/borrower/dashboard/requests/my-requests",
        icon: FileText,
      },
      {
        title: "Create Request",
        href: "/borrower/dashboard/requests/new",
        icon: Plus,
      },
      {
        title: "Received Offers",
        href: "/borrower/dashboard/requests/offers",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Active Loans",
    href: "/borrower/dashboard/loans",
    icon: CreditCard,
    children: [
      {
        title: "Current Loans",
        href: "/borrower/dashboard/loans/active",
        icon: DollarSign,
      },
      {
        title: "Repayments",
        href: "/borrower/dashboard/loans/repayments",
        icon: Clock,
      },
      {
        title: "Payment Schedule",
        href: "/borrower/dashboard/loans/schedule",
        icon: Calendar,
      },
    ],
  },
  {
    title: "My Reputation",
    href: "/borrower/dashboard/reputation",
    icon: TrendingUp,
    children: [
      {
        title: "Credit Score",
        href: "/borrower/dashboard/reputation/score",
        icon: Star,
      },
      {
        title: "Loan History",
        href: "/borrower/dashboard/reputation/history",
        icon: History,
      },
      {
        title: "Achievements",
        href: "/borrower/dashboard/reputation/achievements",
        icon: Award,
      },
    ],
  },
  {
    title: "Documents",
    href: "/borrower/dashboard/documents",
    icon: Upload,
  },
  {
    title: "Messages",
    href: "/borrower/dashboard/messages",
    icon: MessageSquare,
    badge: "2",
  },
  {
    title: "Notifications",
    href: "/borrower/dashboard/notifications",
    icon: Bell,
    badge: "3",
  },
  {
    title: "Profile",
    href: "/borrower/dashboard/profile",
    icon: User,
  },
  {
    title: "Settings",
    href: "/borrower/dashboard/settings",
    icon: Settings,
  },
]

interface BorrowerDashboardSidebarProps {
  profile: any
  creditScore: number
  hasActiveLoans: boolean
}

export function BorrowerDashboardSidebar({
  profile,
  creditScore,
  hasActiveLoans,
}: BorrowerDashboardSidebarProps) {
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
    if (href === "/borrower/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600"
    if (score >= 650) return "text-blue-600"
    if (score >= 550) return "text-yellow-600"
    return "text-red-600"
  }

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return "Excellent"
    if (score >= 650) return "Good"
    if (score >= 550) return "Fair"
    return "Poor"
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon
    const active = isActive(item.href)
    const expanded = expandedItems.includes(item.title)

    if (item.children) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
              active && "bg-blue-50 text-blue-700",
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
        href={item.href}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          level > 0 && "ml-4"
        )}
        onClick={() => setIsMobileOpen(false)}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </div>
        {item.badge && (
          <Badge variant="default" className="ml-auto">
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Credlio</h2>
                <p className="text-xs text-gray-500">Borrower Dashboard</p>
              </div>
            </Link>
          </div>

          {/* User Info & Credit Score */}
          <div className="border-b px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                {profile.full_name?.charAt(0) || "B"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name || "Borrower"}
                </p>
                <p className="text-xs text-gray-500">
                  {profile.email}
                </p>
              </div>
            </div>

            {/* Credit Score Display */}
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Credit Score</span>
                <Badge variant="outline" className={cn("text-xs", getCreditScoreColor(creditScore))}>
                  {getCreditScoreLabel(creditScore)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(creditScore / 850) * 100} className="h-2 flex-1" />
                <span className={cn("text-lg font-bold", getCreditScoreColor(creditScore))}>
                  {creditScore}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/borrower/dashboard/requests/new">
                <Button size="sm" variant="outline" className="w-full">
                  <Plus className="mr-1 h-3 w-3" />
                  New Request
                </Button>
              </Link>
              {hasActiveLoans && (
                <Link href="/borrower/dashboard/loans/repayments">
                  <Button size="sm" className="w-full">
                    <DollarSign className="mr-1 h-3 w-3" />
                    Pay Now
                  </Button>
                </Link>
              )}
              {!hasActiveLoans && (
                <Link href="/borrower/dashboard/requests/offers">
                  <Button size="sm" className="w-full">
                    <FileText className="mr-1 h-3 w-3" />
                    View Offers
                  </Button>
                </Link>
              )}
            </div>
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