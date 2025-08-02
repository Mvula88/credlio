"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, ArrowLeft, Home, Phone, Mail, Shield } from "lucide-react"

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-gray-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Access Forbidden</h1>
          <p className="text-lg text-gray-600">
            You don't have the required permissions to view this page
          </p>
        </div>

        <Card className="mb-6 border-2">
          <CardHeader className="border-b bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-red-900">403 - Forbidden</CardTitle>
                <CardDescription className="text-red-700">
                  This area is restricted based on your current user role
                </CardDescription>
              </div>
              <Badge variant="destructive" className="text-sm">
                Access Denied
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Explanation */}
              <Alert className="border-amber-200 bg-amber-50">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Security Notice:</strong> This page is protected by role-based access
                  controls. Different user types (borrowers, lenders, admins) have access to
                  different areas of the platform.
                </AlertDescription>
              </Alert>

              {/* Possible Reasons */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  Possible reasons for this restriction:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    You need to sign in with a different account type
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Your subscription plan doesn't include access to this feature
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    You're trying to access an admin-only section
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Your account may need additional verification
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => router.back()}
                    variant="default"
                    size="lg"
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </Button>
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go to Home
                  </Button>
                </div>

                <Button
                  onClick={() => router.push("/auth/signin")}
                  variant="secondary"
                  size="lg"
                  className="w-full gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Sign in with Different Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
            <CardDescription>
              If you believe you should have access to this page, contact our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>support@credlio.com</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
