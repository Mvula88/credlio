import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings, User } from "lucide-react"
import type { Database } from "@/lib/types/database"

export async function Navigation() {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let profile = null
  let userRoles: string[] = []

  if (session) {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        user_profile_roles (
          user_roles (
            name
          )
        )
      `)
      .eq("auth_user_id", session.user.id)
      .single()

    profile = data
    userRoles = data?.user_profile_roles?.map((upr: any) => upr.user_roles.name) || []
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl">Credlio</span>
        </Link>

        {session && profile && (
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {userRoles.includes("borrower") && (
              <Link href="/borrower/dashboard" className="hover:text-primary">
                Borrower Dashboard
              </Link>
            )}
            {userRoles.includes("lender") && (
              <Link href="/lender/dashboard" className="hover:text-primary">
                Lender Dashboard
              </Link>
            )}
            {userRoles.includes("admin") && (
              <Link href="/admin/dashboard" className="hover:text-primary">
                Admin Dashboard
              </Link>
            )}
          </nav>
        )}

        <div className="flex flex-1 items-center justify-end space-x-4">
          {session ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {profile?.full_name || session.user.email}</span>

              {/* User Menu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/signin?role=borrower">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup?role=borrower">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
