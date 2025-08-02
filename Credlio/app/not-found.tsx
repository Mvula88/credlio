"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FileQuestion, ArrowLeft, Home, Search, Phone, Mail, Shield } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <FileQuestion className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-lg text-gray-600">
            The page you're looking for doesn't exist or has been moved
          </p>
        </div>

        <Card className="mb-6 border-2">
          <CardHeader className="border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-blue-900">404 - Not Found</CardTitle>
                <CardDescription className="text-blue-700">
                  This URL doesn't match any pages on our platform
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Missing Page
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Explanation */}
              <Alert className="border-amber-200 bg-amber-50">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Don't worry!</strong> This happens sometimes when URLs change or when you
                  follow an outdated link.
                </AlertDescription>
              </Alert>

              {/* Suggestions */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Here's what you can try:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Check the URL for typos and try again
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Go back to the previous page using your browser
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Visit our homepage and navigate from there
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                    Use the search function if available
                  </li>
                </ul>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">Popular destinations:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Link
                    href="/borrower/dashboard"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Borrower Dashboard
                  </Link>
                  <Link
                    href="/lender/dashboard"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Lender Dashboard
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Create Account
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => window.history.back()}
                    variant="default"
                    size="lg"
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </Button>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      Go to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Still Need Help?</CardTitle>
            <CardDescription>
              If you can't find what you're looking for, our support team is here to help
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
