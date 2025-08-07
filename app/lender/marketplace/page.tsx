import { redirect } from "next/navigation"

export default function MarketplacePage() {
  // Redirect to the dashboard marketplace
  redirect("/lender/dashboard/marketplace")
}