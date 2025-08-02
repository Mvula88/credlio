"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logAuditAction } from "./audit"

const LoanRequestSchema = z.object({
  borrowerProfileId: z.string().uuid(),
  countryId: z.string().uuid(),
  loanAmount: z.coerce.number().positive("Loan amount must be positive."),
  currencyCode: z.string().length(3, "Currency code must be 3 characters.").toUpperCase(),
  purpose: z.string().min(10, "Purpose must be at least 10 characters long.").max(500),
  repaymentTerms: z.string().min(3, "Repayment terms must be at least 3 characters long.").max(100),
})

type LoanRequestState = {
  message: string
  errors?: {
    borrowerProfileId?: string[]
    countryId?: string[]
    loanAmount?: string[]
    currencyCode?: string[]
    purpose?: string[]
    repaymentTerms?: string[]
    general?: string[]
  } | null
  success: boolean
}

export async function createLoanRequestAction(
  prevState: LoanRequestState,
  formData: FormData
): Promise<LoanRequestState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = LoanRequestSchema.safeParse({
    borrowerProfileId: formData.get("borrowerProfileId"),
    countryId: formData.get("countryId"),
    loanAmount: formData.get("loanAmount"),
    currencyCode: formData.get("currencyCode"),
    purpose: formData.get("purpose"),
    repaymentTerms: formData.get("repaymentTerms"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const { borrowerProfileId, countryId, loanAmount, currencyCode, purpose, repaymentTerms } =
    validatedFields.data

  try {
    // RLS policy `loan_requests_borrower_insert` will be enforced by Supabase
    // It checks: auth.user_has_role('borrower'),
    // borrower_profile_id = auth.get_current_profile_id(),
    // country_id = auth.get_current_user_country_id()
    // The form passes borrowerProfileId and countryId, but RLS uses JWT context for validation.
    // Ensure the passed borrowerProfileId matches auth.get_current_profile_id() from JWT.
    // This is implicitly handled by RLS.

    const { data: loanRequest, error } = await supabase
      .from("loan_requests")
      .insert({
        borrower_profile_id: borrowerProfileId,
        country_id: countryId,
        loan_amount: loanAmount,
        currency_code: currencyCode,
        purpose: purpose,
        repayment_terms: repaymentTerms, // Assuming you have this column
        status: "pending_lender_acceptance", // Or 'pending_admin_approval'
        // requested_at is handled by default value in DB
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating loan request:", error)
      // Check for specific RLS violation error if possible
      if (error.message.includes("violates row-level security policy")) {
        return {
          message:
            "Permission denied. Ensure you are a borrower and submitting for your own profile and country.",
          errors: { general: ["RLS policy violation."] },
          success: false,
        }
      }
      return {
        message: error.message || "Failed to create loan request.",
        errors: { general: [error.message] },
        success: false,
      }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: borrowerProfileId,
      actorRole: "borrower",
      action: "LOAN_REQUEST_CREATED",
      targetResourceId: loanRequest.id,
      targetResourceType: "loan_requests",
      countryId: countryId,
      details: { amount: loanAmount, currency: currencyCode, purpose },
    })

    revalidatePath("/borrower/dashboard") // Revalidate the dashboard to show the new request
    return { message: "Loan request submitted successfully!", errors: null, success: true }
  } catch (e: any) {
    console.error("Unexpected error creating loan request:", e)
    return {
      message: "An unexpected error occurred.",
      errors: { general: [e.message] },
      success: false,
    }
  }
}
