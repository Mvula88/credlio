import { redirect } from "next/navigation"

export default function SettingsPage() {
  // Redirect to the dashboard version
  redirect("/admin/dashboard/settings")
}