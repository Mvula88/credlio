import { redirect } from "next/navigation"

export default function CountryPage() {
  // Redirect to the country dashboard
  redirect("/admin/country/dashboard")
}