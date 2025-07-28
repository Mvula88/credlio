"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logAuditAction } from "./audit" // Assuming you have this audit action

const MakeOfferSchema = z.object({
  loanRequestId: z.string().uuid("Invalid loan request ID."),
  lenderProfileId: z.string().uuid("Invalid lender profile ID."),
  countryId: z.string().uuid("Invalid country ID."),
  offerAmount: z.coerce.number().positive("Offer amount must be positive."),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative.").max(100, "Interest rate seems too high."),
  repaymentTermsProposed: z.string().min(5, "Repayment terms must be at least 5 characters.").max(200),
  notesToBorrower: z.string().max(500, "Notes are too long.").optional(),
})

type MakeOfferState = {
  message: string
  errors?: z.ZodError<typeof MakeOfferSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
  offerId?: string
}

export async function makeLoanOfferAction(prevState: MakeOfferState, formData: FormData): Promise<MakeOfferState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = MakeOfferSchema.safeParse({
    loanRequestId: formData.get("loanRequestId"),
    lenderProfileId: formData.get("lenderProfileId"), // This should come from the logged-in user's session/profile
    countryId: formData.get("countryId"), // This should match the loan request's country
    offerAmount: formData.get("offerAmount"),
    interestRate: formData.get("interestRate"),
    repaymentTermsProposed: formData.get("repaymentTermsProposed"),
    notesToBorrower: formData.get("notesToBorrower"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const {
    loanRequestId,
    lenderProfileId,
    countryId,
    offerAmount,
    interestRate,
    repaymentTermsProposed,
    notesToBorrower,
  } = validatedFields.data

  try {
    // RLS policy "loan_offers_lender_insert" will be enforced by Supabase.
    // It checks:
    // - User has 'lender' role.
    // - lender_profile_id matches current user's profile.
    // - country_id matches current user's country.
    // - Loan request exists, status is 'pending_lender_acceptance', and in the same country.
    // - Lender is not offering on their own request.

    const { data: offer, error } = await supabase
      .from("loan_offers")
      .insert({
        loan_request_id: loanRequestId,
        lender_profile_id: lenderProfileId,
        country_id: countryId,
        offer_amount: offerAmount,
        interest_rate: interestRate,
        repayment_terms_proposed: repaymentTermsProposed,
        notes_to_borrower: notesToBorrower,
        offer_status: "pending_borrower_acceptance",
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating loan offer:", error)
      if (error.message.includes("violates row-level security policy")) {
        return {
          message:
            "Permission denied or offer conditions not met. Ensure the loan request is still available and you are eligible to make an offer.",
          errors: { general: ["RLS policy violation."] },
          success: false,
        }
      }
      if (error.message.includes("uq_loan_request_lender_offer")) {
        return {
          message: "You have already made an offer for this loan request.",
          errors: { general: ["Duplicate offer."] },
          success: false,
        }
      }
      return {
        message: error.message || "Failed to create loan offer.",
        errors: { general: [error.message] },
        success: false,
      }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: lenderProfileId,
      actorRole: "lender",
      action: "LOAN_OFFER_CREATED",
      targetResourceId: offer.id, // ID of the newly created loan_offer
      targetResourceType: "loan_offers",
      secondaryTargetResourceId: loanRequestId, // ID of the loan_request
      secondaryTargetResourceType: "loan_requests",
      countryId: countryId,
      details: { offerAmount, interestRate, loanRequestId },
    })

    revalidatePath(`/lender/requests/${loanRequestId}`) // Revalidate the loan request details page
    revalidatePath("/lender/dashboard") // Revalidate lender dashboard (maybe they show their offers there)
    return { message: "Loan offer submitted successfully!", errors: null, success: true, offerId: offer.id }
  } catch (e: any) {
    console.error("Unexpected error creating loan offer:", e)
    return { message: "An unexpected error occurred.", errors: { general: [e.message] }, success: false }
  }
}
