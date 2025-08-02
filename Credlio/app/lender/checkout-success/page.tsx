import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  // Get current user session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    redirect("/auth/signin")
  }

  // Get user profile and ensure lender role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .single()

  if (!profile) {
    redirect("/auth/signin")
  }

  // Ensure user has lender role
  const { data: userRole } = await supabase
    .from("user_profile_roles")
    .select(
      `
      user_roles (
        role_name
      )
    `
    )
    .eq("profile_id", profile.id)
    .eq("user_roles.role_name", "lender")
    .single()

  // If no lender role found, add it
  if (!userRole) {
    const { data: lenderRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role_name", "lender")
      .single()

    if (lenderRole) {
      await supabase.from("user_profile_roles").insert({
        profile_id: profile.id,
        role_id: lenderRole.id,
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-green-700">
            Thank You for Subscribing!
          </CardTitle>
          <CardDescription className="text-lg">
            Your subscription has been successfully activated
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="mb-2 font-semibold text-green-800">Subscription Details</h3>
            <div className="space-y-1 text-sm text-green-700">
              <p>
                <strong>Email:</strong> {session.user.email}
              </p>
              <p>
                <strong>Status:</strong> Active (1-day free trial)
              </p>
              {searchParams.session_id && (
                <p>
                  <strong>Session ID:</strong> {searchParams.session_id.substring(0, 20)}...
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-800">What's Next?</h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• Your 1-day free trial has started</li>
              <li>• Access all premium features immediately</li>
              <li>• Browse loan requests from verified borrowers</li>
              <li>• Start making profitable investments</li>
            </ul>
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/lender/dashboard">Continue to Dashboard</Link>
            </Button>
            <p className="mt-2 text-sm text-gray-600">
              You can access your dashboard anytime from the navigation menu
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
