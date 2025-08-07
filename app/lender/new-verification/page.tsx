import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { DocumentVerificationPanel } from "@/components/lender/document-verification-panel"

export default async function NewVerificationPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "lender") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Document Verification</h1>
        <p className="text-muted-foreground mb-8">
          Verify borrower documents for loan applications
        </p>
        <DocumentVerificationPanel />
      </div>
    </div>
  )
}