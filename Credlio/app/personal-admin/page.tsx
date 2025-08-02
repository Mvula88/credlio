import { PersonalAdminDashboard } from "@/components/admin/personal-admin-dashboard"
import { requireRole } from "@/lib/supabase/auth-helpers"

export default async function PersonalAdminPage() {
  // Ensure only super admins (you) can access this page
  await requireRole("super_admin")

  return (
    <div className="container mx-auto py-6">
      <PersonalAdminDashboard />
    </div>
  )
}
