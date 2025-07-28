"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, AlertTriangle, ArrowRight, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export default function BorrowerDisclaimerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createSupabaseClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Session error:", sessionError)
          setError("Failed to verify session")
          setLoading(false)
          return
        }

        if (!session || !session.user) {
          router.push("/auth/signin?role=borrower")
          return
        }

        const userRole = session.user.user_metadata?.role
        if (userRole !== "borrower") {
          router.push("/auth/signin?role=borrower")
          return
        }

        setUser(session.user)
        setLoading(false)
      } catch (err) {
        console.error("Error checking session:", err)
        setError("Failed to verify authentication")
        setLoading(false)
      }
    }

    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Verifying your account...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/auth/signin?role=borrower")} className="w-full mt-4">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Credlio, {user.user_metadata?.full_name || user.email}!
          </CardTitle>
          <CardDescription className="text-gray-600">Important information before you continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Important Notice:</strong> Credlio is not a cash loan provider.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What Credlio Does:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                Connects borrowers with individual lenders
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                Provides a reputation system to build trust
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                Facilitates loan requests and offers
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                Tracks payment history and reputation
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              As a borrower, you can create loan requests that will be visible to our network of lenders. Individual
              lenders will review your requests and may choose to make offers based on your reputation and loan details.
            </p>
          </div>

          <Link href="/dashboard/borrower" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Continue to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
