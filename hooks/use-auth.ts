"use client"

import { useAuth } from "@/lib/auth-context"

// Re-export the useAuth hook for easier imports
export { useAuth }

// Additional auth utility hooks
export function useIsAuthenticated() {
  const { user, loading } = useAuth()
  return { isAuthenticated: !!user, loading }
}

export function useUserRole() {
  const { profile, loading } = useAuth()
  return { role: profile?.role || null, loading }
}

export function useIsBorrower() {
  const { profile } = useAuth()
  return profile?.role === "borrower"
}

export function useIsLender() {
  const { profile } = useAuth()
  return profile?.role === "lender"
}

export function useIsAdmin() {
  const { profile } = useAuth()
  return profile?.role === "admin"
}
