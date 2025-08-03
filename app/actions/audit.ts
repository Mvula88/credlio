"use server"

import { createAuditLog as createAuditLogDb } from "@/lib/data/audit"
// You might want to get IP and User-Agent from request headers if available
// For server actions, this is less straightforward than API routes.
// import { headers } from "next/headers"

interface LogAuditActionArgs {
  actorProfileId?: string
  actorRole?: string // e.g., 'lender', 'admin', 'system'
  action: string // e.g., 'UPDATED_PROFILE', 'BLACKLISTED_USER'
  targetProfileId?: string
  targetResourceId?: string
  targetResourceType?: string
  countryId?: string
  details?: Record<string, any>
}

export async function logAuditAction(args: LogAuditActionArgs) {
  // const heads = headers()
  // const ipAddress = heads.get("x-forwarded-for") ?? undefined
  // const userAgent = heads.get("user-agent") ?? undefined

  try {
    // Convert to the expected format for createAuditLogDb
    const userId = args.actorProfileId || 'system'
    const action = args.action
    const details = {
      actorRole: args.actorRole,
      targetProfileId: args.targetProfileId,
      targetResourceId: args.targetResourceId,
      targetResourceType: args.targetResourceType,
      countryId: args.countryId,
      ...args.details
    }
    
    await createAuditLogDb(userId, action, details)
    return { success: true }
  } catch (error) {
    console.error("Failed to log audit action:", error)
    return { success: false, error: "Failed to log audit action" }
  }
}

// Export alias for compatibility
export const createAuditLog = logAuditAction
