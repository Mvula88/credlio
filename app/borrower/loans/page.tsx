import { redirect } from "next/navigation"

export default function LoansPage() {
  // Redirect to the dashboard version
  redirect("/borrower/dashboard/loans/active")
}