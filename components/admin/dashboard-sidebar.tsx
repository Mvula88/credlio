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
  Globe,
  DollarSign,
  Shield,
  BarChart3,
  Settings,
  FileText,
  Database,
  AlertTriangle,
  Activity,
  CreditCard,
  UserCheck,
  UserX,
  Building2,
  Map,
  TrendingUp,
  Lock,
  Key,
  Mail,
  Bell,
  Download,
  Upload,
  Search,
  Filter,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Zap,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  HelpCircle,
  Terminal
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  superAdminOnly?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "User Management",
    href: "/admin/dashboard/users",
    icon: Users,
    children: [
      {
        title: "All Users",
        href: "/admin/dashboard/users/all",
        icon: Users,
      },
      {
        title: "Lenders",
        href: "/admin/dashboard/users/lenders",
        icon: Building2,
      },
      {
        title: "Borrowers",
        href: "/admin/dashboard/users/borrowers",
        icon: UserCheck,
      },
      {
        title: "Verification Queue",
        href: "/admin/dashboard/users/verification",
        icon: UserCheck,
        badge: "12",
      },
      {
        title: "Banned Users",
        href: "/admin/dashboard/users/banned",
        icon: UserX,
      },
      {
        title: "Country Admins",
        href: "/admin/dashboard/users/country-admins",
        icon: Globe,
        superAdminOnly: true,
      },
    ],
  },
  {
    title: "Countries",
    href: "/admin/dashboard/countries",
    icon: Globe,
    children: [
      {
        title: "Manage Countries",
        href: "/admin/dashboard/countries/manage",
        icon: Map,
      },
      {
        title: "Country Statistics",
        href: "/admin/dashboard/countries/stats",
        icon: BarChart3,
      },
      {
        title: "Risk Levels",
        href: "/admin/dashboard/countries/risk",
        icon: AlertTriangle,
      },
      {
        title: "Currency Settings",
        href: "/admin/dashboard/countries/currency",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Financial Overview",
    href: "/admin/dashboard/financial",
    icon: DollarSign,
    children: [
      {
        title: "Loan Analytics",
        href: "/admin/dashboard/financial/loans",
        icon: TrendingUp,
      },
      {
        title: "Transaction History",
        href: "/admin/dashboard/financial/transactions",
        icon: CreditCard,
      },
      {
        title: "Subscription Revenue",
        href: "/admin/dashboard/financial/subscriptions",
        icon: Zap,
      },
      {
        title: "Default Tracking",
        href: "/admin/dashboard/financial/defaults",
        icon: AlertTriangle,
      },
      {
        title: "Platform Fees",
        href: "/admin/dashboard/financial/fees",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Compliance & Risk",
    href: "/admin/dashboard/compliance",
    icon: Shield,
    children: [
      {
        title: "Blacklist Management",
        href: "/admin/dashboard/compliance/blacklist",
        icon: Ban,
      },
      {
        title: "Fraud Detection",
        href: "/admin/dashboard/compliance/fraud",
        icon: AlertTriangle,
      },
      {
        title: "KYC/AML",
        href: "/admin/dashboard/compliance/kyc",
        icon: UserCheck,
      },
      {
        title: "Audit Logs",
        href: "/admin/dashboard/compliance/audit",
        icon: FileText,
      },
      {
        title: "Risk Dashboard",
        href: "/admin/dashboard/compliance/risk",
        icon: Activity,
      },
    ],
  },
  {
    title: "Reports & Analytics",
    href: "/admin/dashboard/reports",
    icon: BarChart3,
    children: [
      {
        title: "System Reports",
        href: "/admin/dashboard/reports/system",
        icon: FileText,
      },
      {
        title: "User Reports",
        href: "/admin/dashboard/reports/users",
        icon: Users,
      },
      {
        title: "Financial Reports",
        href: "/admin/dashboard/reports/financial",
        icon: DollarSign,
      },
      {
        title: "Export Data",
        href: "/admin/dashboard/reports/export",
        icon: Download,
      },
      {
        title: "Custom Reports",
        href: "/admin/dashboard/reports/custom",
        icon: Filter,
      },
    ],
  },
  {
    title: "Communications",
    href: "/admin/dashboard/communications",
    icon: Mail,
    children: [
      {
        title: "Announcements",
        href: "/admin/dashboard/communications/announcements",
        icon: Bell,
      },
      {
        title: "Email Templates",
        href: "/admin/dashboard/communications/templates",
        icon: Mail,
      },
      {
        title: "Support Tickets",
        href: "/admin/dashboard/communications/support",
        icon: HelpCircle,
        badge: "8",
      },
      {
        title: "Broadcast Message",
        href: "/admin/dashboard/communications/broadcast",
        icon: Zap,
      },
    ],
  },
  {
    title: "System Settings",
    href: "/admin/dashboard/settings",
    icon: Settings,
    superAdminOnly: true,
    children: [
      {
        title: "Platform Settings",
        href: "/admin/dashboard/settings/platform",
        icon: Settings,
      },
      {
        title: "Security Settings",
        href: "/admin/dashboard/settings/security",
        icon: Lock,
      },
      {
        title: "API Keys",
        href: "/admin/dashboard/settings/api",
        icon: Key,
      },
      {
        title: "Database",
        href: "/admin/dashboard/settings/database",
        icon: Database,
      },
      {
        title: "Integrations",
        href: "/admin/dashboard/settings/integrations",
        icon: Zap,
      },
    ],
  },
  {
    title: "Developer Tools",
    href: "/admin/dashboard/developer",
    icon: Terminal,
    superAdminOnly: true,
  },
]

interface AdminDashboardSidebarProps {
  profile: any
  systemStats: {
    totalUsers: number
    totalLenders: number
    totalBorrowers: number
    activeLoans: number
    totalCountries: number
  }
  isSuperAdmin: boolean
}

export function AdminDashboardSidebar({
  profile,
  systemStats,
  isSuperAdmin,
}: AdminDashboardSidebarProps) {
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
    if (href === "/admin/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    // Hide super admin only items for regular admins
    if (item.superAdminOnly && !isSuperAdmin) {
      return null
    }

    const Icon = item.icon
    const active = isActive(item.href)
    const expanded = expandedItems.includes(item.title)

    if (item.children) {
      const visibleChildren = item.children.filter(child => 
        !child.superAdminOnly || isSuperAdmin
      )

      if (visibleChildren.length === 0) return null

      return (
        <div key={item.href}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100",
              active && "bg-purple-50 text-purple-700",
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
              {visibleChildren.map(child => renderNavItem(child, level + 1))}
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
            ? "bg-purple-50 text-purple-700"
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
          {/* Header */}
          <div className="border-b bg-purple-50 px-4 py-5">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Credlio Admin</h2>
                <p className="text-xs text-gray-600">
                  {isSuperAdmin ? "Super Admin" : "Administrator"}
                </p>
              </div>
            </Link>
          </div>

          {/* System Stats */}
          <div className="border-b px-4 py-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Users</p>
                <p className="text-lg font-bold text-gray-900">{systemStats.totalUsers}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Active Loans</p>
                <p className="text-lg font-bold text-gray-900">{systemStats.activeLoans}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Lenders</p>
                <p className="text-lg font-bold text-gray-900">{systemStats.totalLenders}</p>
              </div>
              <div className="rounded bg-white p-2">
                <p className="text-gray-500">Borrowers</p>
                <p className="text-lg font-bold text-gray-900">{systemStats.totalBorrowers}</p>
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
            <div className="mb-3 rounded-lg bg-purple-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
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