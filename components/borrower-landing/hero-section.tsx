"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Award,
  Sparkles,
  UserCheck,
  Star,
  Lock,
  Gift,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

export function BorrowerHeroSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationCode = searchParams.get('invitation')
  const invitedEmail = searchParams.get('email')

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute left-10 top-20 -z-10 animate-pulse">
        <div className="h-72 w-72 rounded-full bg-emerald-200 opacity-20 blur-3xl" />
      </div>
      <div className="absolute bottom-20 right-10 -z-10 animate-pulse delay-1000">
        <div className="h-72 w-72 rounded-full bg-teal-200 opacity-20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Invitation Alert */}
          {invitationCode && (
            <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
              <Gift className="h-4 w-4" />
              <AlertDescription>
                You've been invited to join Credlio! Sign up now to connect with your lender.
              </AlertDescription>
            </Alert>
          )}

          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 bg-emerald-100 text-emerald-800 border-emerald-200">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Build Your Credit Reputation
          </Badge>

          {/* Main Heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Get Loans Based on{" "}
            <span className="relative">
              Your Trust Score
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9C2 9 75.5 2 150 2C224.5 2 298 9 298 9"
                  stroke="url(#gradient-borrower)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient-borrower" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-xl leading-relaxed text-gray-600 sm:text-2xl">
            Join a trusted network where your payment history matters. Build your reputation and access better loan terms.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button 
              size="lg" 
              className="group px-8 py-6 text-lg shadow-lg transition-all hover:shadow-xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                const signupUrl = invitationCode 
                  ? `/signup/borrower?invitation=${invitationCode}&email=${invitedEmail || ''}`
                  : "/signup/borrower"
                router.push(signupUrl)
              }}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {invitationCode ? 'Accept Invitation & Sign Up' : 'Create Your Profile'}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-6 text-lg border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              onClick={() => router.push("/auth/signin")}
            >
              <Lock className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="font-medium">Build Credit Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                <Award className="h-5 w-5 text-teal-600" />
              </div>
              <span className="font-medium">Earn Trust Badges</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                <UserCheck className="h-5 w-5 text-cyan-600" />
              </div>
              <span className="font-medium">Verified Network</span>
            </div>
          </div>

          {/* Small link for lenders */}
          <div className="mt-8 text-sm text-gray-500">
            Are you a lender? <Link href="/" className="text-emerald-600 hover:underline">Visit lender portal →</Link>
          </div>
        </div>
      </div>
    </section>
  )
}