import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function BorrowerLoansPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: activeLoans },
    { data: completedLoans },
    { data: loanStats }
  ] = await Promise.all([
    supabase
      .from("loan_offers")
      .select(`
        *,
        loan_request:loan_requests(
          amount_requested,
          purpose,
          repayment_period
        ),
        lender:profiles!loan_offers_lender_profile_id_fkey(
          full_name,
          email,
          company_name
        )
      `)
      .eq("loan_request.borrower_profile_id", profile.id)
      .in("status", ["active", "accepted"])
      .order("created_at", { ascending: false }),
    
    supabase
      .from("loan_offers")
      .select(`
        *,
        loan_request:loan_requests(
          amount_requested,
          purpose
        ),
        lender:profiles!loan_offers_lender_profile_id_fkey(
          full_name,
          company_name
        )
      `)
      .eq("loan_request.borrower_profile_id", profile.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10),
    
    supabase.rpc("get_borrower_loan_stats", { borrower_id: profile.id })
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Loans</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Loans</h3>
          <p className="text-2xl font-bold mt-2">{activeLoans?.length || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Borrowed</h3>
          <p className="text-2xl font-bold mt-2">${loanStats?.total_borrowed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Repaid</h3>
          <p className="text-2xl font-bold mt-2">${loanStats?.total_repaid || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
          <p className="text-2xl font-bold mt-2">${loanStats?.outstanding_amount || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Active Loans</h2>
        </div>
        <div className="p-6">
          {activeLoans && activeLoans.length > 0 ? (
            <div className="space-y-4">
              {activeLoans.map((loan: any) => (
                <div key={loan.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{loan.loan_request?.purpose}</p>
                      <p className="text-sm text-gray-600">
                        Lender: {loan.lender?.company_name || loan.lender?.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: ${loan.offered_amount} at {loan.interest_rate}% interest
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {loan.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        Due: {new Date(loan.repayment_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Make Payment
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No active loans</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Completed Loans</h2>
        </div>
        <div className="p-6">
          {completedLoans && completedLoans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lender</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedLoans.map((loan: any) => (
                    <tr key={loan.id}>
                      <td className="px-4 py-2 text-sm">{loan.loan_request?.purpose}</td>
                      <td className="px-4 py-2 text-sm">{loan.lender?.company_name || loan.lender?.full_name}</td>
                      <td className="px-4 py-2 text-sm">${loan.offered_amount}</td>
                      <td className="px-4 py-2 text-sm">{new Date(loan.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No completed loans</p>
          )}
        </div>
      </div>
    </div>
  )
}