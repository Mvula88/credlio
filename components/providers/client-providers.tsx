"use client"

import type React from "react"
import { AuthProvider } from "@/lib/auth-context"

// Client-only providers
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
