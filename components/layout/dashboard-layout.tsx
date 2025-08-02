"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SignOutButton } from "@/components/auth/sign-out-button"
import {
  BarChart3,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Search,
  Settings,
  Shield,
  TrendingUp,
  User,
  Users,
  UserPlus,
  Calendar,
  Bell,
  Globe,
  Building2,
  Activity,
  PieChart,
  History,
} from "lucide-react"

interface DashboardLayoutProps {
  children: ReactNode
  userRole: "borrower" | "lender" | "admin" | "country_admin"
  userName?: string
  userCountry?: string
}

const navigationItems = {
  borrower: [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/borrower/dashboard", icon: Home },
        { title: "My Profile", url: "/borrower/profile", icon: User },
      ],
    },
    {
      title: "Loans",
      items: [
        { title: "My Requests", url: "/borrower/requests", icon: FileText },
        { title: "Received Offers", url: "/borrower/offers", icon: DollarSign },
        { title: "Active Loans", url: "/borrower/loans", icon: CreditCard },
        { title: "Payment History", url: "/borrower/payments", icon: History },
      ],
    },
    {
      title: "Reputation",
      items: [
        { title: "Credit Score", url: "/borrower/reputation", icon: TrendingUp },
        { title: "Loan History", url: "/borrower/history", icon: BarChart3 },
      ],
    },
  ],
  lender: [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/lender/dashboard", icon: Home },
        { title: "Subscription", url: "/lender/subscription", icon: CreditCard },
      ],
    },
    {
      title: "Lending",
      items: [
        { title: "Search Borrowers", url: "/lender/search", icon: Search },
        { title: "Loan Offers", url: "/lender/offers", icon: DollarSign },
        { title: "Active Loans", url: "/lender/loans", icon: FileText },
        { title: "Marketplace", url: "/lender/marketplace", icon: Users },
      ],
    },
    {
      title: "Management",
      items: [
        { title: "Invite Borrowers", url: "/lender/invite", icon: UserPlus },
        { title: "Blacklist", url: "/lender/blacklist", icon: Shield },
        { title: "Payments", url: "/lender/payments", icon: Activity },
      ],
    },
  ],
  admin: [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: Home },
        { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
      ],
    },
    {
      title: "Management",
      items: [
        { title: "Users", url: "/admin/users", icon: Users },
        { title: "Loans", url: "/admin/loans", icon: CreditCard },
        { title: "Payments", url: "/admin/payments", icon: DollarSign },
        { title: "Countries", url: "/admin/countries", icon: Globe },
      ],
    },
    {
      title: "Security",
      items: [
        { title: "Blacklist", url: "/admin/blacklist", icon: Shield },
        { title: "Audit Logs", url: "/admin/audit-logs", icon: FileText },
      ],
    },
  ],
  country_admin: [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: Home },
        { title: "Country Stats", url: "/admin/country", icon: Building2 },
      ],
    },
    {
      title: "Management",
      items: [
        { title: "Local Users", url: "/admin/users", icon: Users },
        { title: "Local Loans", url: "/admin/loans", icon: CreditCard },
        { title: "Local Blacklist", url: "/admin/blacklist", icon: Shield },
      ],
    },
  ],
}

export function DashboardLayout({
  children,
  userRole,
  userName,
  userCountry,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const menuItems = navigationItems[userRole] || []

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "borrower":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            Borrower
          </Badge>
        )
      case "lender":
        return (
          <Badge variant="default" className="bg-green-50 text-green-700">
            Lender
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="destructive" className="bg-purple-50 text-purple-700">
            Admin
          </Badge>
        )
      case "country_admin":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            Country Admin
          </Badge>
        )
      default:
        return <Badge variant="secondary">User</Badge>
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Shield className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Credlio</span>
              <span className="truncate text-xs">Credit Bureau</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {menuItems.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <div className="w-full">
                  <SignOutButton />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* User Info */}
          <div className="border-t px-2 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                <User className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userName || "User"}</span>
                <div className="flex items-center gap-1">{getRoleBadge(userRole)}</div>
              </div>
            </div>

            {userCountry && (
              <div className="mt-2 rounded-md bg-muted/50 px-2 py-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="size-3" />
                  <span>{userCountry}</span>
                </div>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="bg-sidebar-border h-4 w-px" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {userRole === "borrower" && "Borrower Portal"}
                {userRole === "lender" && "Lender Portal"}
                {(userRole === "admin" || userRole === "country_admin") && "Admin Portal"}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 px-4">
            <Button variant="ghost" size="icon">
              <Bell className="size-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Calendar className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
