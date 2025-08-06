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
  UserCheck,
  UserX,
  Shield,
  FileText,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Activity,
  Bell,
  Settings,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Globe,
  TrendingUp,
  Ban,
  CheckCircle,
  Clock,
  Map,
  Building2
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
    href: "/admin/country/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    href: "/admin/country/dashboard/users",
    icon: Users,
    children: [
      {
        title: "All Users",
        href: "/admin/country/dashboard/users/all",
        icon: Users,
      },
      {
        title: "Lenders",
        href: "/admin/country/dashboard/users/lenders",
        icon: Building2,
      },
      {
        title: "Borrowers",
        href: "/admin/country/dashboard/users/borrowers",
        icon: UserCheck,
      },
      {
        title: "Verification Queue",
        href: "/admin/country/dashboard/users/verification",
        icon: UserCheck,
        badge: "5",
      },
      {
        title: "Blacklisted",
        href: "/admin/country/dashboard/users/blacklisted",
        icon: UserX,
      },
    ],
  },
  {
    title: "Loan Management",
    href: "/admin/country/dashboard/loans",
    icon: DollarSign,
    children: [
      {
        title: "Active Loans",
        href: "/admin/country/dashboard/loans/active",
        icon: Activity,
      },
      {
        title: "Loan Requests",
        href: "/admin/country/dashboard/loans/requests",
        icon: FileText,
      },
      {
        title: "Defaults",
        href: "/admin/country/dashboard/loans/defaults",
        icon: AlertTriangle,
      },
      {
        title: "Repayments",
        href: "/admin/country/dashboard/loans/repayments",
        icon: CheckCircle,
      },
    ],
  },
  {
    title: "Compliance",
    href: "/admin/country/dashboard/compliance",
    icon: Shield,
    children: [
      {
        title: "Blacklist Management",
        href: "/admin/country/dashboard/compliance/blacklist",
        icon: Ban,
      },
      {
        title: "KYC Verification",
        href: "/admin/country/dashboard/compliance/kyc",
        icon: UserCheck,
      },
      {
        title: "Risk Monitoring",
        href: "/admin/country/dashboard/compliance/risk",
        icon: AlertTriangle,
      },
      {
        title: "Fraud Reports",
        href: "/admin/country/dashboard/compliance/fraud",
        icon: Shield,
      },
    ],
  },
  {
    title: "Analytics",
    href: "/admin/country/dashboard/analytics",
    icon: BarChart3,
    children: [
      {
        title: "Performance Metrics",
        href: "/admin/country/dashboard/analytics/performance",
        icon: TrendingUp,
      },
      {
        title: "User Analytics",
        href: "/admin/country/dashboard/analytics/users",
        icon: Users,
      },
      {
        title: "Financial Reports",
        href: "/admin/country/dashboard/analytics/financial",
        icon: DollarSign,
      },
      {
        title: "Risk Analysis",
        href: "/admin/country/dashboard/analytics/risk",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Support",
    href: "/admin/country/dashboard/support",
    icon: Bell,
    children: [
      {
        title: "User Tickets",
        href: "/admin/country/dashboard/support/tickets",
        icon: FileText,
        badge: "3",
      },
      {
        title: "Disputes",
        href: "/admin/country/dashboard/support/disputes",
        icon: AlertTriangle,
      },
      {
        title: "Announcements",
        href: "/admin/country/dashboard/support/announcements",
        icon: Bell,
      },
    ],
  },
  {
    title: "Settings",
    href: "/admin/country/dashboard/settings",
    icon: Settings,
  },
]

interface CountryAdminDashboardSidebarProps {
  profile: any
  country: any
  stats: {
    totalUsers: number
    totalLenders: number
    totalBorrowers: number
    activeLoans: number
    verificationPending: number
    blacklistedUsers: number
  }
}

export function CountryAdminDashboardSidebar({
  profile,
  country,
  stats,
}: CountryAdminDashboardSidebarProps) {
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
    if (href === "/admin/country/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
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
            <div className="flex items-center gap-2">
              {item.badge && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-90"
                )}
              />
            </div>
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
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
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
          {/* Header with Country Info */}
          <div className="border-b bg-blue-50 px-4 py-5">
            <Link href="/admin/country/dashboard" className="flex items-center gap-2">
              <div className="text-3xl">{country.flag_emoji}</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{country.name}</h2>
                <p className="text-xs text-gray-600">Country Administrator</p>
              </div>
            </Link>
          </div>

          {/* Country Stats */}
          <div className="border-b px-4 py-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Total Users</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Active Loans</p>
                <p className="text-lg font-bold text-gray-900">{stats.activeLoans}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Pending</p>
                <p className="text-lg font-bold text-amber-600">{stats.verificationPending}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Blacklisted</p>
                <p className="text-lg font-bold text-red-600">{stats.blacklistedUsers}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded bg-blue-50 p-2 text-center">
                <p className="text-xs text-gray-600">Lenders</p>
                <p className="text-lg font-bold text-blue-700">{stats.totalLenders}</p>
              </div>
              <div className="rounded bg-purple-50 p-2 text-center">
                <p className="text-xs text-gray-600">Borrowers</p>
                <p className="text-lg font-bold text-purple-700">{stats.totalBorrowers}</p>
              </div>
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
            <div className="mb-3 rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {profile.full_name?.charAt(0) || "A"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {profile.full_name || "Administrator"}
                  </p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
              <span>Currency: {country.currency_code}</span>
              <span>Risk: {country.risk_level}</span>
            </div>
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