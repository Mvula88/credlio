"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Users,
  FileSearch,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export function HeroSection() {
  const router = useRouter()
  const { user, loading } = useAuth()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute left-10 top-20 -z-10 animate-pulse">
        <div className="h-72 w-72 rounded-full bg-blue-200 opacity-20 blur-3xl" />
      </div>
      <div className="absolute bottom-20 right-10 -z-10 animate-pulse delay-1000">
        <div className="h-72 w-72 rounded-full bg-purple-200 opacity-20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Trusted Credit Verification Platform
          </Badge>

          {/* Main Heading */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Lend Safely.{" "}
            <span className="relative">
              Check First.
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9C2 9 75.5 2 150 2C224.5 2 298 9 298 9"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-10 text-xl leading-relaxed text-gray-600 sm:text-2xl">
            Verify borrower creditworthiness and manage your loans with confidence.
          </p>

          {/* CTA Buttons */}
          {!loading && !user && (
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button 
                size="lg" 
                className="group px-8 py-6 text-lg shadow-lg transition-all hover:shadow-xl"
                onClick={() => router.push("/auth/signup")}
              >
                <Users className="mr-2 h-5 w-5" />
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-6 text-lg"
                onClick={() => router.push("/auth/signin")}
              >
                <FileSearch className="mr-2 h-5 w-5" />
                Sign In
              </Button>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <span className="font-medium">Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium">Real-time Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <span className="font-medium">Trusted by Thousands</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}