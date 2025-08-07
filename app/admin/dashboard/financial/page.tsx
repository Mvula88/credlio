import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function FinancialDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: financialOverview },
    { data: recentTransactions },
    { data: monthlyRevenue }
  ] = await Promise.all([
    supabase.rpc("get_financial_overview"),
    supabase
      .from("loan_payments")
      .select(`
        *,
        loan_offer:loan_offers(
          offered_amount,
          interest_rate
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("financial_summaries")
      .select("*")
      .order("summary_date", { ascending: false })
      .limit(30)
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Lent</h3>
          <p className="text-2xl font-bold mt-2">${financialOverview?.total_lent || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Repaid</h3>
          <p className="text-2xl font-bold mt-2">${financialOverview?.total_repaid || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
          <p className="text-2xl font-bold mt-2">${financialOverview?.total_outstanding || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Default Rate</h3>
          <p className="text-2xl font-bold mt-2">{financialOverview?.default_rate || 0}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions?.map((transaction: any) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-2 text-sm">{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-sm">${transaction.amount_paid}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}