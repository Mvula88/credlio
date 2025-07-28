"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logAuditAction } from "./audit"
import { createNotificationEntry } from "@/lib/data/notifications"

// Schema for initiating a payment
const InitiatePaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID."),
  borrowerProfileId: z.string().uuid("Invalid borrower profile ID."),
  lenderProfileId: z.string().uuid("Invalid lender profile ID."),
  loanRequestId: z.string().uuid("Invalid loan request ID."),
  paymentMethod: z.string().min(1, "Payment method is required."),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
})

type InitiatePaymentState = {
  message: string
  errors?: z.ZodError<typeof InitiatePaymentSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
}

export async function initiatePaymentAction(
  prevState: InitiatePaymentState,
  formData: FormData,
): Promise<InitiatePaymentState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = InitiatePaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    borrowerProfileId: formData.get("borrowerProfileId"),
    lenderProfileId: formData.get("lenderProfileId"),
    loanRequestId: formData.get("loanRequestId"),
    paymentMethod: formData.get("paymentMethod"),
    transactionReference: formData.get("transactionReference"),
    notes: formData.get("notes"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const { paymentId, borrowerProfileId, lenderProfileId, loanRequestId, paymentMethod, transactionReference, notes } =
    validatedFields.data

  try {
    // Update the payment status to pending_confirmation
    const { error } = await supabase
      .from("loan_payments")
      .update({
        payment_status: "pending_confirmation",
        payment_method: paymentMethod,
        transaction_reference: transactionReference,
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("borrower_profile_id", borrowerProfileId) // Ensure borrower owns this payment

    if (error) {
      console.error("Error initiating payment:", error)
      return {
        message: error.message || "Failed to initiate payment.",
        success: false,
      }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: borrowerProfileId,
      actorRole: "borrower",
      action: "PAYMENT_INITIATED",
      targetResourceId: paymentId,
      targetResourceType: "loan_payments",
      secondaryTargetResourceId: loanRequestId,
      secondaryTargetResourceType: "loan_requests",
      details: { paymentMethod, transactionReference },
    })

    // Create notification for lender
    await createNotificationEntry({
      recipientProfileId: lenderProfileId,
      type: "payment_initiated",
      title: "Payment Initiated",
      message: `A borrower has initiated a payment for one of your loans. Please review and confirm.`,
      referenceUrl: `/lender/payments/${paymentId}`,
    })

    revalidatePath("/borrower/payments")
    revalidatePath(`/borrower/loans/${loanRequestId}`)

    return {
      message: "Payment initiated successfully. Awaiting confirmation from the lender.",
      success: true,
    }
  } catch (e: any) {
    console.error("Unexpected error initiating payment:", e)
    return {
      message: "An unexpected error occurred.",
      success: false,
    }
  }
}

// Schema for confirming a payment
const ConfirmPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID."),
  lenderProfileId: z.string().uuid("Invalid lender profile ID."),
  borrowerProfileId: z.string().uuid("Invalid borrower profile ID."),
  loanRequestId: z.string().uuid("Invalid loan request ID."),
  amountPaid: z.coerce.number().positive("Amount paid must be positive."),
  notes: z.string().optional(),
})

type ConfirmPaymentState = {
  message: string
  errors?: z.ZodError<typeof ConfirmPaymentSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
}

export async function confirmPaymentAction(
  prevState: ConfirmPaymentState,
  formData: FormData,
): Promise<ConfirmPaymentState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = ConfirmPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    lenderProfileId: formData.get("lenderProfileId"),
    borrowerProfileId: formData.get("borrowerProfileId"),
    loanRequestId: formData.get("loanRequestId"),
    amountPaid: formData.get("amountPaid"),
    notes: formData.get("notes"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const { paymentId, lenderProfileId, borrowerProfileId, loanRequestId, amountPaid, notes } = validatedFields.data

  try {
    // Update the payment status to completed
    const { error } = await supabase
      .from("loan_payments")
      .update({
        payment_status: "completed",
        amount_paid: amountPaid,
        payment_date: new Date().toISOString(),
        notes: notes ? `${notes} (confirmed)` : "(confirmed)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("lender_profile_id", lenderProfileId) // Ensure lender owns this payment
      .eq("payment_status", "pending_confirmation") // Only confirm pending payments

    if (error) {
      console.error("Error confirming payment:", error)
      return {
        message: error.message || "Failed to confirm payment.",
        success: false,
      }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: lenderProfileId,
      actorRole: "lender",
      action: "PAYMENT_CONFIRMED",
      targetResourceId: paymentId,
      targetResourceType: "loan_payments",
      secondaryTargetResourceId: loanRequestId,
      secondaryTargetResourceType: "loan_requests",
      targetProfileId: borrowerProfileId,
      details: { amountPaid },
    })

    // Create notification for borrower
    await createNotificationEntry({
      recipientProfileId: borrowerProfileId,
      type: "payment_confirmed",
      title: "Payment Confirmed",
      message: `Your payment has been confirmed by the lender.`,
      referenceUrl: `/borrower/payments/${paymentId}`,
    })

    revalidatePath("/lender/payments")
    revalidatePath(`/lender/loans/${loanRequestId}`)

    return {
      message: "Payment confirmed successfully.",
      success: true,
    }
  } catch (e: any) {
    console.error("Unexpected error confirming payment:", e)
    return {
      message: "An unexpected error occurred.",
      success: false,
    }
  }
}

// Schema for marking a payment as failed
const FailPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID."),
  lenderProfileId: z.string().uuid("Invalid lender profile ID."),
  borrowerProfileId: z.string().uuid("Invalid borrower profile ID."),
  loanRequestId: z.string().uuid("Invalid loan request ID."),
  notes: z.string().min(1, "Please provide a reason for marking the payment as failed."),
})

type FailPaymentState = {
  message: string
  errors?: z.ZodError<typeof FailPaymentSchema>["formErrors"]["fieldErrors"] | null
  success: boolean
}

export async function markPaymentAsFailedAction(
  prevState: FailPaymentState,
  formData: FormData,
): Promise<FailPaymentState> {
  const supabase = createServerSupabaseClient()

  const validatedFields = FailPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    lenderProfileId: formData.get("lenderProfileId"),
    borrowerProfileId: formData.get("borrowerProfileId"),
    loanRequestId: formData.get("loanRequestId"),
    notes: formData.get("notes"),
  })

  if (!validatedFields.success) {
    return {
      message: "Validation failed. Please check your inputs.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    }
  }

  const { paymentId, lenderProfileId, borrowerProfileId, loanRequestId, notes } = validatedFields.data

  try {
    // Update the payment status to failed
    const { error } = await supabase
      .from("loan_payments")
      .update({
        payment_status: "failed",
        notes: `${notes} (marked as failed)`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("lender_profile_id", lenderProfileId) // Ensure lender owns this payment
      .eq("payment_status", "pending_confirmation") // Only fail pending payments

    if (error) {
      console.error("Error marking payment as failed:", error)
      return {
        message: error.message || "Failed to mark payment as failed.",
        success: false,
      }
    }

    // Log audit action
    await logAuditAction({
      actorProfileId: lenderProfileId,
      actorRole: "lender",
      action: "PAYMENT_FAILED",
      targetResourceId: paymentId,
      targetResourceType: "loan_payments",
      secondaryTargetResourceId: loanRequestId,
      secondaryTargetResourceType: "loan_requests",
      targetProfileId: borrowerProfileId,
      details: { reason: notes },
    })

    // Create notification for borrower
    await createNotificationEntry({
      recipientProfileId: borrowerProfileId,
      type: "payment_failed",
      title: "Payment Failed",
      message: `Your payment could not be confirmed. Reason: ${notes}`,
      referenceUrl: `/borrower/payments/${paymentId}`,
    })

    revalidatePath("/lender/payments")
    revalidatePath(`/lender/loans/${loanRequestId}`)

    return {
      message: "Payment marked as failed.",
      success: true,
    }
  } catch (e: any) {
    console.error("Unexpected error marking payment as failed:", e)
    return {
      message: "An unexpected error occurred.",
      success: false,
    }
  }
}
