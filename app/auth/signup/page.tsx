export const dynamic = "force-dynamic"

import { SignUpForm } from "@/components/auth/signup-form"
import { SupabaseDebug } from "@/components/debug/supabase-debug"

export default function SignUpPage() {
  return (
    <div>
      <SupabaseDebug />
      <SignUpForm />
    </div>
  )
}
