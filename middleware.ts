import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/types/database"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Check if Supabase environment variables are configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Skip middleware if Supabase is not configured
    return res
  }

  try {
    const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const url = req.nextUrl.clone()

  // Protected routes that require authentication
  const protectedRoutes = ["/settings", "/dashboard", "/borrower", "/lender", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) => url.pathname.startsWith(route))

  // Auth routes that should redirect if already logged in
  const authRoutes = ["/signup/borrower", "/signup/lender", "/login/borrower", "/login/lender"]
  const isAuthRoute = authRoutes.includes(url.pathname)

  // If accessing protected route without session, redirect to appropriate login
  if (isProtectedRoute && !session) {
    // Default to borrower login, but could be made smarter based on the route
    url.pathname = "/login/borrower"
    return NextResponse.redirect(url)
  }

  // If logged in and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", session.user.id)
        .single()

      if (profile?.role === "borrower") {
        url.pathname = "/dashboard/borrower"
        return NextResponse.redirect(url)
      } else if (profile?.role === "lender") {
        url.pathname = "/dashboard/lender"
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error("Error fetching profile in middleware:", error)
    }
  }

  return res
  } catch (error) {
    console.error("Middleware error:", error)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
