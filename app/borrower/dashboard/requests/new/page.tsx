import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { CreateLoanRequestForm } from "@/components/borrower/create-loan-request-form"

export default async function NewRequestPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, country_id, full_name")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "borrower") {
    redirect("/")
  }

  const { data: country } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("id", profile.country_id)
    .single()

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Loan Request</h1>
        <p className="text-muted-foreground mb-8">
          Submit a new loan request for lenders to review
        </p>
        <CreateLoanRequestForm 
          borrowerProfileId={profile.id}
          countryId={profile.country_id}
          currencyCode={country?.currency_code || "USD"}
        />
      </div>
    </div>
  )
}