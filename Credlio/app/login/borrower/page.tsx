import { redirect } from "next/navigation"

export default function BorrowerLoginPage() {
  // Redirect to unified secure signin page
  redirect("/auth/signin")
}
