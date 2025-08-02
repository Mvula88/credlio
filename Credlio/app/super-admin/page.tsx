import { SuperAdminDashboard } from "@/components/admin/super-admin-dashboard"
import { requireRole } from "@/lib/supabase/auth-helpers"

export default async function SuperAdminPage() {
  // Ensure only super admins can access this page
  await requireRole("super_admin")

  return (
    <div className="container mx-auto py-6">
      <SuperAdminDashboard />
    </div>
  )
}
