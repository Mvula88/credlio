"use client"

import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Partner {
  id: string
  name: string
  logo?: string
}

export function TrustedBySection() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        // Simulating API call - in production this could come from your backend
        const data: Partner[] = [
          { id: "1", name: "SecureFinance" },
          { id: "2", name: "TrustLend Partners" },
          { id: "3", name: "QuickCredit Pro" },
          { id: "4", name: "SafePay Systems" },
          { id: "5", name: "CreditGuard" },
          { id: "6", name: "LendSmart" },
        ]
        setPartners(data)
      } catch (error) {
        console.error("Failed to fetch partners:", error)
      } finally {
        setLoading(false)
      }
    }

    // Simulate network delay
    setTimeout(fetchPartners, 500)
  }, [])

  return (
    <section className="border-t bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Trusted by leading financial institutions
          </p>
        </div>
        
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {loading ? (
              // Skeleton loaders
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center">
                  <Skeleton className="mb-2 h-12 w-12 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : (
              partners.map((partner) => (
                <div
                  key={partner.id}
                  className="group flex flex-col items-center justify-center transition-all duration-300 hover:scale-105"
                >
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 transition-colors group-hover:bg-gray-200">
                    <Building2 className="h-8 w-8 text-gray-400 transition-colors group-hover:text-gray-600" />
                  </div>
                  <span className="text-center text-sm font-medium text-gray-600 transition-colors group-hover:text-gray-900">
                    {partner.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Additional Trust Indicators */}
        <div className="mt-16 grid grid-cols-1 gap-4 border-t pt-12 text-center md:grid-cols-3">
          <div>
            <div className="text-3xl font-bold text-gray-900">256-bit</div>
            <div className="mt-1 text-sm text-gray-600">Bank-level Encryption</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">99.9%</div>
            <div className="mt-1 text-sm text-gray-600">Uptime Guarantee</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">24/7</div>
            <div className="mt-1 text-sm text-gray-600">Customer Support</div>
          </div>
        </div>
      </div>
    </section>
  )
}