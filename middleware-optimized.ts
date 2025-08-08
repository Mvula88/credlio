import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/types/database"

// Cache for user profiles to reduce database calls
const profileCache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds cache

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const url = req.nextUrl.clone()
  
  // Skip middleware for static assets and API routes
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".") // Skip files with extensions
  ) {
    return res
  }

  const supabase = createMiddlewareClient<Database>({ req, res })

  // Define routes
  const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/borrower", "/lender-disclaimer", "/borrower-disclaimer"]
  const authRoutes = ["/auth/signin", "/auth/signup", "/signup/borrower", "/signup/lender", "/login/borrower", "/login/lender"]
  const protectedPrefixes = ["/dashboard", "/settings", "/profile", "/notifications", "/messages", "/borrower/dashboard", "/lender/dashboard", "/admin", "/super-admin"]
  
  const isPublicRoute = publicRoutes.includes(url.pathname)
  const isAuthRoute = authRoutes.some(route => url.pathname.startsWith(route))
  const isProtectedRoute = protectedPrefixes.some(prefix => url.pathname.startsWith(prefix))
  
  // Allow public routes without session check
  if (isPublicRoute && !isProtectedRoute) {
    return res
  }

  // Get session only once
  const { data: { session } } = await supabase.auth.getSession()

  // Handle unauthenticated access to protected routes
  if (!session && isProtectedRoute) {
    url.pathname = "/auth/signin"
    url.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Handle authenticated users
  if (session) {
    const userId = session.user.id
    const now = Date.now()
    
    // Check cache first
    let profile = null
    const cached = profileCache.get(userId)
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      profile = cached.profile
    } else {
      // Fetch profile only once per request
      const { data } = await supabase
        .from("profiles")
        .select("id, role, country_id, email_confirmed")
        .eq("auth_user_id", userId)
        .single()
      
      profile = data
      
      // Update cache
      if (profile) {
        profileCache.set(userId, { profile, timestamp: now })
      }
    }

    if (!profile) {
      // No profile found, redirect to auth
      await supabase.auth.signOut()
      url.pathname = "/auth/signin"
      return NextResponse.redirect(url)
    }

    // Handle auth routes for authenticated users
    if (isAuthRoute) {
      // Redirect to appropriate dashboard
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

    // Simple role-based access control
    const path = url.pathname
    if (
      (path.startsWith("/borrower/dashboard") && profile.role !== "borrower") ||
      (path.startsWith("/lender/dashboard") && profile.role !== "lender") ||
      (path.startsWith("/admin") && !["admin", "super_admin", "country_admin"].includes(profile.role))
    ) {
      url.pathname = "/403"
      return NextResponse.redirect(url)
    }

    // Handle root redirect for authenticated users
    if (url.pathname === "/" && profile.role) {
      switch (profile.role) {
        case "borrower":
          url.pathname = "/borrower/dashboard"
          return NextResponse.redirect(url)
        case "lender":
          url.pathname = "/lender/dashboard"
          return NextResponse.redirect(url)
        case "admin":
        case "super_admin":
        case "country_admin":
          // Let admins see the homepage
          return res
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
}