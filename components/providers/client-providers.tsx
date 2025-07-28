"use client"

import type React from "react"

// Client-only providers
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
