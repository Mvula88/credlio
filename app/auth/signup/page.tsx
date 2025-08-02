export const dynamic = "force-dynamic"

import { SignupForm } from "@/components/auth/signup-form"
import { SupabaseDebug } from "@/components/debug/supabase-debug"

export default function SignUpPage() {
  return (
    <div>
      <SupabaseDebug />
      <SignupForm role="borrower" />
    </div>
  )
}
