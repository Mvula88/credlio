import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ComplianceDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: complianceMetrics },
    { data: complianceLogs },
    { data: riskProfiles }
  ] = await Promise.all([
    supabase.rpc("get_compliance_metrics"),
    supabase
      .from("compliance_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("*")
      .or("is_blacklisted.eq.true,reputation_score.lt.40")
      .limit(10)
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compliance Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold mt-2">{complianceMetrics?.total_users || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Verified Users</h3>
          <p className="text-2xl font-bold mt-2">{complianceMetrics?.verified_users || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">High Risk Users</h3>
          <p className="text-2xl font-bold mt-2">{complianceMetrics?.high_risk_users || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Compliance Logs</h2>
        <div className="space-y-4">
          {complianceLogs?.map((log: any) => (
            <div key={log.id} className="border-l-4 border-blue-500 pl-4">
              <p className="font-medium">{log.log_type}</p>
              <p className="text-sm text-gray-600">{log.description}</p>
              <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}