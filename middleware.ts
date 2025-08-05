import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/types/database"
import { checkSessionLocation } from "@/lib/middleware/session-location-check"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const url = req.nextUrl.clone()

  // Define route protection rules
  const roleBasedRoutes = {
    borrower: ["/borrower"],
    lender: ["/lender"],
    admin: ["/admin", "/super-admin", "/personal-admin"],
    super_admin: ["/super-admin"],
    country_admin: ["/admin/country"],
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    "/settings",
    "/dashboard",
    "/borrower",
    "/lender",
    "/admin",
    "/super-admin",
    "/personal-admin",
    "/profile",
    "/notifications",
    "/messages",
  ]

  // Auth routes that should redirect if already logged in
  const authRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/signup/borrower",
    "/signup/lender",
    "/login/borrower",
    "/login/lender",
  ]

  const isProtectedRoute = protectedRoutes.some((route) => url.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => url.pathname.startsWith(route))

  // If accessing protected route without session, redirect to signin
  if (isProtectedRoute && !session) {
    url.pathname = "/auth/signin"
    url.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If we have a session, check role-based access
  if (session) {
    // Check email verification
    const { data: user } = await supabase.auth.getUser()
    if (user?.user && !user.user.email_confirmed_at && isProtectedRoute) {
      // Allow access to settings page to see verification message
      if (!url.pathname.startsWith("/settings")) {
        url.pathname = "/settings"
        url.searchParams.set("verify", "true")
        return NextResponse.redirect(url)
      }
    }

    // Fetch user profile and check role-based access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, country_id, countries(code)")
      .eq("auth_user_id", session.user.id)
      .single()

    if (profile) {
      // Check if user needs to select a country
      if (
        !profile.country_id &&
        !url.pathname.startsWith("/auth/select-country") &&
        isProtectedRoute
      ) {
        url.pathname = "/auth/select-country"
        return NextResponse.redirect(url)
      }
      
      // Perform location verification for protected routes
      if (isProtectedRoute && (profile.countries as any)?.code) {
        const locationCheck = await checkSessionLocation(req)
        
        // Handle blocked access
        if (!locationCheck.allowed) {
          // Sign out and redirect to login with error
          await supabase.auth.signOut()
          url.pathname = "/auth/signin"
          url.searchParams.set("error", "location_blocked")
          url.searchParams.set("message", locationCheck.reason || "Access denied from this location")
          return NextResponse.redirect(url)
        }
        
        // Add risk score to response headers for monitoring
        if (locationCheck.riskScore && locationCheck.riskScore > 50) {
          res.headers.set("X-Location-Risk", locationCheck.riskScore.toString())
        }
      }

      // Check role-based route access
      // Special handling for admin roles - you're the only one with these roles
      const isAdminRole = ["admin", "super_admin", "country_admin"].includes(profile.role)
      
      if (isAdminRole) {
        // Allow access to all admin routes for admin users
        const adminRoutes = ["/admin", "/super-admin", "/personal-admin"]
        if (adminRoutes.some(route => url.pathname.startsWith(route))) {
          // Access granted - continue
        }
      } else {
        // Non-admin users - check specific role access
        for (const [role, routes] of Object.entries(roleBasedRoutes)) {
          const isRoleRoute = routes.some((route) => url.pathname.startsWith(route))
          if (isRoleRoute && profile.role !== role) {
            // User doesn't have permission - redirect to 403
            url.pathname = "/403"
            return NextResponse.redirect(url)
          }
        }
      }

      // If logged in and trying to access auth routes, redirect to appropriate dashboard
      if (isAuthRoute) {
        switch (profile.role) {
          case "borrower":
            url.pathname = "/borrower/dashboard"
            break
          case "lender":
            url.pathname = "/lender/dashboard"
            break
          case "admin":
          case "super_admin":
            url.pathname = "/super-admin/dashboard"
            break
          case "country_admin":
            url.pathname = "/admin/country"
            break
          default:
            url.pathname = "/dashboard"
        }
        return NextResponse.redirect(url)
      }

      // Handle root path redirect based on role
      if (url.pathname === "/") {
        switch (profile.role) {
          case "borrower":
            url.pathname = "/borrower/dashboard"
            break
          case "lender":
            url.pathname = "/lender/dashboard"
            break
          case "admin":
          case "super_admin":
            url.pathname = "/super-admin/dashboard"
            break
          case "country_admin":
            url.pathname = "/admin/country"
            break
          default:
            url.pathname = "/dashboard"
        }
        return NextResponse.redirect(url)
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle auth internally)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api|auth/test|auth/simple-test|auth/debug).*)",
  ],
}
