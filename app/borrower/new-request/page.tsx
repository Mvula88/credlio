import { redirect } from "next/navigation"

export default function NewRequestPage() {
  // Redirect to the dashboard version
  redirect("/borrower/dashboard/requests/new")
}