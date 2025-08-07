import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function BorrowerRequestsPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  const { data: loanRequests } = await supabase
    .from("loan_requests")
    .select(`
      *,
      offers:loan_offers(
        id,
        offered_amount,
        interest_rate,
        repayment_period,
        status,
        lender:profiles!loan_offers_lender_profile_id_fkey(
          full_name,
          company_name
        )
      )
    `)
    .eq("borrower_profile_id", profile.id)
    .order("created_at", { ascending: false })

  const activeRequests = loanRequests?.filter(r => r.status === 'pending') || []
  const closedRequests = loanRequests?.filter(r => r.status !== 'pending') || []

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Loan Requests</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          New Request
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Requests</h3>
          <p className="text-2xl font-bold mt-2">{activeRequests.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Offers</h3>
          <p className="text-2xl font-bold mt-2">
            {activeRequests.reduce((sum, req) => sum + (req.offers?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Interest Rate</h3>
          <p className="text-2xl font-bold mt-2">
            {(() => {
              const allOffers = activeRequests.flatMap(r => r.offers || [])
              if (allOffers.length === 0) return '0'
              const avgRate = allOffers.reduce((sum, o) => sum + o.interest_rate, 0) / allOffers.length
              return avgRate.toFixed(1)
            })()}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Active Requests</h2>
        </div>
        <div className="p-6">
          {activeRequests.length > 0 ? (
            <div className="space-y-4">
              {activeRequests.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-lg">{request.purpose}</p>
                      <p className="text-gray-600">
                        Amount: ${request.amount_requested} • Period: {request.repayment_period} months
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {request.status}
                    </span>
                  </div>
                  
                  {request.offers && request.offers.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Offers ({request.offers.length})</p>
                      <div className="space-y-2">
                        {request.offers.slice(0, 3).map((offer: any) => (
                          <div key={offer.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="text-sm">
                              <span className="font-medium">
                                {offer.lender?.company_name || offer.lender?.full_name}
                              </span>
                              <span className="ml-2 text-gray-600">
                                ${offer.offered_amount} at {offer.interest_rate}%
                              </span>
                            </div>
                            <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      View Offers
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                      Edit Request
                    </button>
                    <button className="px-4 py-2 text-red-600 hover:text-red-800">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active loan requests</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Create Your First Request
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Closed Requests</h2>
        </div>
        <div className="p-6">
          {closedRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {closedRequests.map((request: any) => (
                    <tr key={request.id}>
                      <td className="px-4 py-2 text-sm">{request.purpose}</td>
                      <td className="px-4 py-2 text-sm">${request.amount_requested}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{new Date(request.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No closed requests</p>
          )}
        </div>
      </div>
    </div>
  )
}