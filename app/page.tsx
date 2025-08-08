"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { HeroSection } from "@/components/home/hero-section"
import { StatsSection } from "@/components/home/stats-section"
import { FeaturesSection } from "@/components/home/features-section"
import { HowItWorksSection } from "@/components/home/how-it-works-section"
import { TestimonialsSection } from "@/components/home/testimonials-section"
import { CTASection } from "@/components/home/cta-section"
import { TrustedBySection } from "@/components/home/trusted-by-section"

export default function LandingPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is authenticated and profile is loaded, redirect to dashboard
    if (!loading && user && profile) {
      const redirectPath = profile.role === "lender" 
        ? "/lender/dashboard" 
        : profile.role === "borrower"
        ? "/borrower/dashboard"
        : profile.role === "admin"
        ? "/admin/dashboard"
        : "/dashboard"
      
      router.push(redirectPath)
    }
  }, [user, profile, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show landing page if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTASection />
        <TrustedBySection />
      </div>
    )
  }

  // Return null while redirecting
  return null
}