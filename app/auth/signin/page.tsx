export const dynamic = "force-dynamic"

import { SecureSigninForm } from "@/components/auth/secure-signin-form"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SecureSigninForm />
    </div>
  )
}
