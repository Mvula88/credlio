"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useCountryAccess } from "@/hooks/use-country-access"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, X, User, Settings, LogOut, ChevronDown, Shield, Globe, MessageSquare } from "lucide-react"
import { CountryInfoBadge, TravelBanner } from "@/components/country/country-info-badge"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const { profile: countryProfile, isTraveling } = useCountryAccess()

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const getDashboardLink = () => {
    switch (profile?.role) {
      case "borrower":
        return "/borrower/dashboard"
      case "lender":
        return "/lender/dashboard"
      case "admin":
        return "/admin/dashboard"
      default:
        return "/dashboard"
    }
  }

  return (
    <>
      {/* Travel Banner */}
      {countryProfile?.is_traveling &&
        countryProfile.home_country &&
        countryProfile.detected_country && (
          <TravelBanner
            homeCountry={countryProfile.home_country}
            currentCountry={countryProfile.detected_country}
            onUpdateCountry={() => router.push("/settings/location")}
          />
        )}

      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-sm font-bold text-white">C</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Credlio</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden items-center space-x-8 md:flex">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                For Lenders
              </Link>
              <Link href="/borrower" className="text-gray-600 hover:text-gray-900">
                For Borrowers
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900">
                How It Works
              </Link>
              <Link href="/help" className="text-gray-600 hover:text-gray-900">
                Help
              </Link>
            </nav>

            {/* User Menu or Auth Buttons */}
            <div className="hidden items-center space-x-4 md:flex">
              {/* Country Badge */}
              {countryProfile?.country && (
                <CountryInfoBadge country={countryProfile.country} size="sm" variant="outline" />
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{profile?.full_name || user.email}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardLink()} className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/messages" className="flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role === "admin" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/dashboard" className="flex items-center">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/super-admin/dashboard" className="flex items-center">
                            <Globe className="mr-2 h-4 w-4" />
                            Super Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {profile?.role === "country_admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/country" className="flex items-center">
                          <Globe className="mr-2 h-4 w-4" />
                          Country Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Sign In <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/signin">Sign In</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Sign Up <ChevronDown className="ml-1 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/signup">Sign Up</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="border-t py-4 md:hidden">
              <div className="flex flex-col space-y-4">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  For Lenders
                </Link>
                <Link href="/borrower" className="text-gray-600 hover:text-gray-900">
                  For Borrowers
                </Link>
                <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900">
                  How It Works
                </Link>
                <Link href="/help" className="text-gray-600 hover:text-gray-900">
                  Help
                </Link>

                {user ? (
                  <div className="space-y-2 border-t pt-4">
                    <Link href={getDashboardLink()} className="flex items-center text-gray-600">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                    {profile?.role === "admin" && (
                      <>
                        <Link href="/admin/dashboard" className="flex items-center text-gray-600">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                        <Link
                          href="/super-admin/dashboard"
                          className="flex items-center text-gray-600"
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          Super Admin
                        </Link>
                      </>
                    )}
                    {profile?.role === "country_admin" && (
                      <Link href="/admin/country" className="flex items-center text-gray-600">
                        <Globe className="mr-2 h-4 w-4" />
                        Country Admin
                      </Link>
                    )}
                    <Link href="/settings" className="flex items-center text-gray-600">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                    <button onClick={handleSignOut} className="flex items-center text-gray-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 border-t pt-4">
                    <Link href="/auth/signin" className="block font-medium text-blue-600">
                      Sign In
                    </Link>
                    <Link href="/auth/signup" className="block font-medium text-blue-600">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
