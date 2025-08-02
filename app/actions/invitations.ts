"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "./audit"
import type { Database } from "@/lib/types/database"

export type InvitationFormData = {
  borrowerName: string
  borrowerEmail?: string
  borrowerPhone?: string
  customMessage?: string
  loanAmount?: number
  loanTermMonths?: number
  interestRate?: number
  expiresInDays?: number
}

export async function createInvitation(formData: InvitationFormData) {
  const supabase = createServerActionClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "Not authenticated", success: false }
  }

  // Get lender profile ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single()

  if (!profile) {
    return { error: "Profile not found", success: false }
  }

  // Create invitation using the database function
  const { data, error } = await supabase.rpc("create_borrower_invitation", {
    p_lender_profile_id: profile.id,
    p_custom_message: formData.customMessage || null,
    p_loan_amount: formData.loanAmount || null,
    p_loan_term_months: formData.loanTermMonths || null,
    p_interest_rate: formData.interestRate || null,
    p_borrower_email: formData.borrowerEmail || null,
    p_borrower_phone: formData.borrowerPhone || null,
    p_borrower_name: formData.borrowerName,
    p_expires_days: formData.expiresInDays || 30,
  })

  if (error) {
    console.error("Error creating invitation:", error)
    return { error: error.message, success: false }
  }

  // Create audit log
  await createAuditLog({
    action: "create_invitation",
    entity_type: "borrower_invitation",
    entity_id: data.invitation_id,
    details: {
      borrower_name: formData.borrowerName,
      invitation_code: data.invitation_code,
    },
  })

  revalidatePath("/lender/dashboard")

  return {
    success: true,
    invitationId: data.invitation_id,
    invitationCode: data.invitation_code,
  }
}

export async function getLenderInvitations(lenderProfileId: string) {
  const supabase = createServerActionClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return []
  }

  const { data: invitations, error } = await supabase
    .from("borrower_invitations")
    .select("*")
    .eq("lender_profile_id", lenderProfileId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching invitations:", error)
    return []
  }

  return invitations
}

export async function cancelInvitation(invitationId: string) {
  const supabase = createServerActionClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "Not authenticated", success: false }
  }

  // Get lender profile ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single()

  if (!profile) {
    return { error: "Profile not found", success: false }
  }

  // Cancel invitation using the database function
  const { data, error } = await supabase.rpc("cancel_borrower_invitation", {
    p_invitation_id: invitationId,
    p_lender_profile_id: profile.id,
  })

  if (error) {
    console.error("Error cancelling invitation:", error)
    return { error: error.message, success: false }
  }

  // Create audit log
  await createAuditLog({
    action: "cancel_invitation",
    entity_type: "borrower_invitation",
    entity_id: invitationId,
    details: {
      cancelled_by: session.user.id,
    },
  })

  revalidatePath("/lender/dashboard")

  return { success: true }
}

export async function getInvitationByCode(code: string) {
  const supabase = createServerActionClient<Database>({ cookies })

  const { data: invitation, error } = await supabase
    .from("borrower_invitations")
    .select(
      `
      *,
      lender:lender_profile_id (
        id,
        full_name,
        email,
        phone_number,
        profile_image_url
      )
    `
    )
    .eq("invitation_code", code)
    .single()

  if (error) {
    console.error("Error fetching invitation:", error)
    return null
  }

  // Check if invitation is expired
  if (invitation.status === "pending" && new Date(invitation.expires_at) < new Date()) {
    return { ...invitation, status: "expired" }
  }

  return invitation
}

export async function acceptInvitation(code: string, borrowerProfileId: string) {
  const supabase = createServerActionClient<Database>({ cookies })

  // Accept invitation using the database function
  const { data, error } = await supabase.rpc("accept_borrower_invitation", {
    p_invitation_code: code,
    p_borrower_profile_id: borrowerProfileId,
  })

  if (error) {
    console.error("Error accepting invitation:", error)
    return { error: error.message, success: false }
  }

  // Create audit log
  await createAuditLog({
    action: "accept_invitation",
    entity_type: "borrower_invitation",
    entity_id: code,
    details: {
      borrower_profile_id: borrowerProfileId,
    },
  })

  return { success: true }
}
