import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LenderRiskDashboard() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: riskMetrics },
    { data: blacklistedBorrowers },
    { data: riskyLoans }
  ] = await Promise.all([
    supabase.rpc("get_lender_risk_metrics", { lender_id: profile.id }),
    supabase
      .from("blacklisted_borrowers")
      .select(`
        *,
        borrower:profiles!blacklisted_borrowers_borrower_profile_id_fkey(
          full_name,
          email
        )
      `)
      .eq("lender_profile_id", profile.id)
      .eq("deregistered", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("loan_offers")
      .select(`
        *,
        loan_request:loan_requests(
          purpose,
          borrower:profiles!loan_requests_borrower_profile_id_fkey(
            full_name,
            credit_score
          )
        ),
        payments:loan_payments(
          status,
          due_date,
          amount_due,
          amount_paid
        )
      `)
      .eq("lender_profile_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
  ])

  // Calculate risk scores for active loans
  const loansWithRisk = riskyLoans?.map((loan: any) => {
    const overduePayments = loan.payments?.filter((p: any) => 
      p.status === 'pending' && new Date(p.due_date) < new Date()
    ).length || 0
    
    const creditScore = loan.loan_request?.borrower?.credit_score || 0
    const riskLevel = overduePayments > 2 ? 'high' : 
                     overduePayments > 0 || creditScore < 600 ? 'medium' : 'low'
    
    return { ...loan, overduePayments, riskLevel }
  }) || []

  const highRiskLoans = loansWithRisk.filter(l => l.riskLevel === 'high')
  const mediumRiskLoans = loansWithRisk.filter(l => l.riskLevel === 'medium')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Risk Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Default Rate</h3>
          <p className="text-2xl font-bold mt-2">{riskMetrics?.default_rate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">High Risk Loans</h3>
          <p className="text-2xl font-bold mt-2 text-red-600">{highRiskLoans.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Medium Risk Loans</h3>
          <p className="text-2xl font-bold mt-2 text-yellow-600">{mediumRiskLoans.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Blacklisted</h3>
          <p className="text-2xl font-bold mt-2">{blacklistedBorrowers?.length || 0}</p>
        </div>
      </div>

      {highRiskLoans.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">High Risk Loans - Immediate Attention Required</h2>
          <div className="space-y-3">
            {highRiskLoans.map((loan: any) => (
              <div key={loan.id} className="bg-white rounded p-4 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{loan.loan_request?.borrower?.full_name}</p>
                    <p className="text-sm text-gray-600">{loan.loan_request?.purpose}</p>
                    <p className="text-sm text-red-600 font-medium">
                      {loan.overduePayments} overdue payments
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${loan.offered_amount}</p>
                    <button className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                      Take Action
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Risk Calculator</h2>
          </div>
          <div className="p-6">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount ($)
                </label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="10000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Borrower Credit Score
                </label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="650" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (%)
                </label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="15" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repayment Period (months)
                </label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="12" />
              </div>
              <button type="button" className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Calculate Risk Score
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Blacklisted Borrowers</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="p-6">
            {blacklistedBorrowers && blacklistedBorrowers.length > 0 ? (
              <div className="space-y-3">
                {blacklistedBorrowers.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.borrower?.full_name}</p>
                      <p className="text-sm text-gray-600">{item.borrower?.email}</p>
                      <p className="text-xs text-red-600">{item.reason}</p>
                    </div>
                    <button className="text-sm text-gray-600 hover:text-gray-900">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No blacklisted borrowers</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Risk Management Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Always verify borrower credentials before approving loans</li>
          <li>• Set appropriate interest rates based on risk assessment</li>
          <li>• Monitor payment patterns and act quickly on delays</li>
          <li>• Diversify your loan portfolio to minimize risk</li>
        </ul>
      </div>
    </div>
  )
}