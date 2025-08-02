"use client"

import type React from "react"

import { useFormState, useFormStatus } from "react-dom"
import { acceptOfferAction, rejectOfferAction } from "@/app/actions/borrower-offer-management"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { LoanOffer } from "@/lib/types" // Assuming LoanOffer type is available
import { useEffect } from "react"

interface OfferActionButtonProps {
  offer: LoanOffer
  borrowerProfileId: string
  loanRequestId: string // Needed for accept action's audit/revalidation
  loanRequestStatus: string // To disable if loan not pending
  countryId: string // For audit
}

const initialActionState = { message: "", success: false, errors: null }

function SubmitButton({
  children,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending || disabled}>
      {pending ? "Processing..." : children}
    </Button>
  )
}

export function AcceptOfferButton({
  offer,
  borrowerProfileId,
  loanRequestId,
  loanRequestStatus,
  countryId,
}: OfferActionButtonProps) {
  const [state, formAction] = useFormState(acceptOfferAction, initialActionState)
  const { toast } = useToast()

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? "Success" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      })
    }
  }, [state, toast])

  const canAccept =
    offer.offer_status === "pending_borrower_acceptance" &&
    loanRequestStatus === "pending_lender_acceptance"

  return (
    <form action={formAction}>
      <input type="hidden" name="offerId" value={offer.id} />
      <input type="hidden" name="borrowerProfileId" value={borrowerProfileId} />
      <input type="hidden" name="loanRequestId" value={loanRequestId} />
      <input type="hidden" name="lenderProfileId" value={offer.lender_profile_id} />
      <input type="hidden" name="countryId" value={offer.country_id} />{" "}
      {/* Assuming offer has country_id */}
      <SubmitButton disabled={!canAccept}>Accept Offer</SubmitButton>
    </form>
  )
}

export function RejectOfferButton({
  offer,
  borrowerProfileId,
  loanRequestId,
  countryId,
}: Omit<OfferActionButtonProps, "loanRequestStatus">) {
  const [state, formAction] = useFormState(rejectOfferAction, initialActionState)
  const { toast } = useToast()

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? "Success" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      })
    }
  }, [state, toast])

  const canReject = offer.offer_status === "pending_borrower_acceptance"

  return (
    <form action={formAction}>
      <input type="hidden" name="offerId" value={offer.id} />
      <input type="hidden" name="borrowerProfileId" value={borrowerProfileId} />
      <input type="hidden" name="loanRequestId" value={loanRequestId} />
      <input type="hidden" name="lenderProfileId" value={offer.lender_profile_id} />
      <input type="hidden" name="countryId" value={offer.country_id} />
      <SubmitButton variant="outline" disabled={!canReject}>
        Reject Offer
      </SubmitButton>
    </form>
  )
}
