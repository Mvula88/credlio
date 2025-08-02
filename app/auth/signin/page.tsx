export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"

export default function SignInPage() {
  // Redirect to role selection page since no role is specified
  redirect("/")
}
