export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"

export default function AuthPage() {
  // Redirect to the new secure signin page
  redirect("/auth/signin")
}
