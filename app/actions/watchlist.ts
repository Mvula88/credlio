"use server"

import { addToWatchlist, removeFromWatchlist } from "@/lib/data/watchlist"
import { revalidatePath } from "next/cache"
import { logAuditAction } from "./audit" // Import the audit action

export async function toggleWatchlistAction(
  lenderProfileId: string,
  borrowerProfileId: string,
  countryId: string,
  isCurrentlyInWatchlist: boolean,
) {
  try {
    const actionType = isCurrentlyInWatchlist ? "REMOVED_FROM_WATCHLIST" : "ADDED_TO_WATCHLIST"

    if (isCurrentlyInWatchlist) {
      await removeFromWatchlist(lenderProfileId, borrowerProfileId)
    } else {
      await addToWatchlist(lenderProfileId, borrowerProfileId, countryId)
    }

    // Log the audit action
    await logAuditAction({
      actorProfileId: lenderProfileId,
      actorRole: "lender", // Assuming the actor is a lender
      action: actionType,
      targetProfileId: borrowerProfileId,
      countryId: countryId,
      details: { lender: lenderProfileId, borrower: borrowerProfileId },
    })

    revalidatePath("/lender/dashboard")
    revalidatePath("/lender/watchlist")

    return { success: true, action: isCurrentlyInWatchlist ? "removed" : "added" }
  } catch (error) {
    console.error("Watchlist action error:", error)
    return { success: false, error: "Failed to update watchlist" }
  }
}
