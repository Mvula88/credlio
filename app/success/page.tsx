"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to lender dashboard
    router.replace("/lender/dashboard")
  }, [router])

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-green-600">Payment Successful!</h1>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
