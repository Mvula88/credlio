import { Suspense } from "react"
import { SecureSignupForm } from "@/components/auth/secure-signup-form"

export default function BorrowerSignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading...</div>}>
        <SecureSignupForm role="borrower" />
      </Suspense>
    </div>
  )
}
