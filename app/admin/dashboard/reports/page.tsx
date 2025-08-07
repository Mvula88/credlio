import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  const { data: reportTypes } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("setting_type", "reports")

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">User Reports</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">User Registration Report</span>
              <p className="text-sm text-gray-600">Daily, weekly, and monthly registrations</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">User Activity Report</span>
              <p className="text-sm text-gray-600">Login patterns and engagement metrics</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Verification Status Report</span>
              <p className="text-sm text-gray-600">KYC completion rates by region</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Financial Reports</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Loan Performance Report</span>
              <p className="text-sm text-gray-600">Loan disbursements and repayments</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Revenue Report</span>
              <p className="text-sm text-gray-600">Platform fees and earnings</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Default Analysis Report</span>
              <p className="text-sm text-gray-600">Loan defaults and recovery rates</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Compliance Reports</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Risk Assessment Report</span>
              <p className="text-sm text-gray-600">Platform risk metrics and alerts</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Audit Trail Report</span>
              <p className="text-sm text-gray-600">System activities and changes</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Regulatory Compliance Report</span>
              <p className="text-sm text-gray-600">Compliance status by jurisdiction</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Operational Reports</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Country Performance Report</span>
              <p className="text-sm text-gray-600">Metrics by geographic region</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">Support Ticket Report</span>
              <p className="text-sm text-gray-600">Customer service metrics</p>
            </button>
            <button className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50">
              <span className="font-medium">System Performance Report</span>
              <p className="text-sm text-gray-600">Platform uptime and response times</p>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Reports can be exported in CSV, Excel, or PDF format. 
          Use the export page to download detailed reports with custom date ranges.
        </p>
      </div>
    </div>
  )
}