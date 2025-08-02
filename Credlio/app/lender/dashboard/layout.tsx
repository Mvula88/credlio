import type React from "react"
import { LenderProvider } from "@/lib/lender-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LenderProvider>{children}</LenderProvider>
}
