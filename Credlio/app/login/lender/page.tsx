import { redirect } from "next/navigation"

export default function LenderLoginPage() {
  // Redirect to unified secure signin page
  redirect("/auth/signin")
}
