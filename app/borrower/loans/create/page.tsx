import { redirect } from "next/navigation"

export default function CreateLoanPage() {
  // Redirect to the dashboard version
  redirect("/borrower/dashboard/requests/new")
}