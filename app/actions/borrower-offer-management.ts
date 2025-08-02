"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logAuditAction } from "./audit" // Assuming audit action exists

// Schema for accepting an offer
const AcceptOfferSchema = z.object({
  offerId: z.string().uuid("Invalid offer ID."),
  borrowerProfileId: z.string().uuid("Invalid borrower profile ID."), // To ensure the correct user is acting
  loanRequestId: z.string().uuid("Invalid loan request ID."), // For revalidation and audit
  lenderProfileId: z.string().uuid("Invalid lender profile ID."), // For audit
  countryId: z.string().uuid("Invalid country ID."), // For audit
})

type AcceptOfferState = {
  message: string
  errors?: z.ZodError<typeof AcceptOfferSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
}

export async function acceptOfferAction(
  prevState: AcceptOfferState,
  formData: FormData
): Promise<AcceptOfferState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = AcceptOfferSchema.safeParse({
    offerId: formData.get("offerId"),
    borrowerProfileId: formData.get("borrowerProfileId"),
    loanRequestId: formData.get("loanRequestId"),
    lenderProfileId: formData.get("lenderProfileId"),
    countryId: formData.get("countryId"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const { offerId, borrowerProfileId, loanRequestId, lenderProfileId, countryId } =
    validatedFields.data

  try {
    // Call the database function
    const { data: rpcData, error: rpcError } = await supabase.rpc("accept_loan_offer", {
      p_offer_id: offerId,
      p_borrower_profile_id: borrowerProfileId,
    })

    if (rpcError) {
      console.error("RPC error accepting offer:", rpcError)
      return {
        message: rpcError.message || "Failed to accept offer due to database error.",
        success: false,
      }
    }

    if (!rpcData || !rpcData[0] || !rpcData[0].success) {
      const errorMessage =
        rpcData && rpcData[0] ? rpcData[0].message : "Failed to accept offer. Please try again."
      return { message: errorMessage, success: false }
    }

    // Log audit actions
    await logAuditAction({
      actorProfileId: borrowerProfileId,
      actorRole: "borrower",
      action: "LOAN_OFFER_ACCEPTED",
      targetResourceId: offerId,
      targetResourceType: "loan_offers",
      secondaryTargetResourceId: loanRequestId,
      secondaryTargetResourceType: "loan_requests",
      targetProfileId: lenderProfileId, // The lender whose offer was accepted
      countryId: countryId,
      details: { offerId, loanRequestId },
    })
    await logAuditAction({
      actorProfileId: borrowerProfileId,
      actorRole: "borrower",
      action: "LOAN_FUNDED", // Or LOAN_REQUEST_FUNDED
      targetResourceId: loanRequestId,
      targetResourceType: "loan_requests",
      secondaryTargetResourceId: lenderProfileId, // Lender who funded
      secondaryTargetResourceType: "profiles",
      countryId: countryId,
      details: { loanRequestId, offerId, lender: lenderProfileId },
    })

    revalidatePath("/borrower/dashboard")
    revalidatePath(`/lender/requests/${loanRequestId}`) // Lenders might see status changes
    revalidatePath(`/lender/dashboard`) // Marketplace updates

    return { message: rpcData[0].message || "Offer accepted successfully!", success: true }
  } catch (e: any) {
    console.error("Unexpected error accepting offer:", e)
    return { message: "An unexpected error occurred.", success: false }
  }
}

// Schema for rejecting an offer
const RejectOfferSchema = z.object({
  offerId: z.string().uuid("Invalid offer ID."),
  borrowerProfileId: z.string().uuid("Invalid borrower profile ID."),
  loanRequestId: z.string().uuid("Invalid loan request ID."), // For audit/revalidation
  lenderProfileId: z.string().uuid("Invalid lender profile ID."), // For audit
  countryId: z.string().uuid("Invalid country ID."), // For audit
})

type RejectOfferState = {
  message: string
  errors?: z.ZodError<typeof RejectOfferSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
}

export async function rejectOfferAction(
  prevState: RejectOfferState,
  formData: FormData
): Promise<RejectOfferState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = RejectOfferSchema.safeParse({
    offerId: formData.get("offerId"),
    borrowerProfileId: formData.get("borrowerProfileId"),
    loanRequestId: formData.get("loanRequestId"),
    lenderProfileId: formData.get("lenderProfileId"),
    countryId: formData.get("countryId"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Invalid data provided.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }
  const { offerId, borrowerProfileId, loanRequestId, lenderProfileId, countryId } =
    validatedFields.data

  try {
    // RLS policy "loan_offers_borrower_update_status" should protect this update.
    // It checks if the user is a borrower and the offer belongs to their loan request.
    // It also checks if the offer_status can be changed to 'rejected_by_borrower'.
    const { error } = await supabase
      .from("loan_offers")
      .update({ offer_status: "rejected_by_borrower", updated_at: new Date().toISOString() })
      .eq("id", offerId)
    // Add an explicit check for borrower to be safe, though RLS should handle it.
    // This requires joining with loan_requests to get borrower_profile_id if not directly on loan_offers.
    // For simplicity, relying on RLS here. If RLS is insufficient, a direct check on loan_request's borrower_profile_id would be needed.
    // The RLS for UPDATE on loan_offers already has:
    // EXISTS (SELECT 1 FROM public.loan_requests lr WHERE lr.id = loan_offers.loan_request_id AND lr.borrower_profile_id = public.get_current_profile_id())

    if (error) {
      console.error("Error rejecting offer:", error)
      if (error.message.includes("violates row-level security policy")) {
        return { message: "Permission denied or offer conditions not met.", success: false }
      }
      return { message: error.message || "Failed to reject offer.", success: false }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: borrowerProfileId,
      actorRole: "borrower",
      action: "LOAN_OFFER_REJECTED",
      targetResourceId: offerId,
      targetResourceType: "loan_offers",
      secondaryTargetResourceId: loanRequestId,
      secondaryTargetResourceType: "loan_requests",
      targetProfileId: lenderProfileId, // The lender whose offer was rejected
      countryId: countryId,
      details: { offerId, loanRequestId },
    })

    revalidatePath("/borrower/dashboard")
    // Potentially revalidate lender views if they see their offer statuses
    revalidatePath(`/lender/requests/${loanRequestId}`)

    return { message: "Offer rejected successfully.", success: true }
  } catch (e: any) {
    console.error("Unexpected error rejecting offer:", e)
    return { message: "An unexpected error occurred.", success: false }
  }
}
