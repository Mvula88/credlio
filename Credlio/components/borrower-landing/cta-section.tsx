"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function BorrowerCTASection() {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid-white.svg')] opacity-10" />
      
      {/* Animated Circles */}
      <div className="absolute -left-10 top-0 h-40 w-40 animate-pulse rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-40 w-40 animate-pulse rounded-full bg-white/10 blur-3xl delay-700" />

      <div className="container relative mx-auto px-4 text-center">
        <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
          Ready to build your credit reputation?
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-emerald-100">
          Join thousands of borrowers who have improved their financial opportunities 
          through building trust on our platform.
        </p>

        {/* Benefits */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-white/90">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Free to join</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Quick verification</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Build credit from day 1</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button 
            size="lg" 
            variant="secondary" 
            className="group px-8 py-6 text-lg font-semibold shadow-xl transition-all hover:shadow-2xl"
            onClick={() => router.push("/signup/borrower")}
          >
            Create Your Profile
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 px-8 py-6 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
            onClick={() => router.push("/borrower-disclaimer")}
          >
            Learn More
          </Button>
        </div>

        {/* Trust Badge */}
        <div className="mt-12">
          <p className="text-sm font-medium text-emerald-200">
            Trusted by borrowers in 8+ countries worldwide
          </p>
        </div>
      </div>
    </section>
  )
}