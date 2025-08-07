import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LenderBorrowersPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "lender") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: connectedBorrowers },
    { data: recentBorrowers }
  ] = await Promise.all([
    supabase.rpc("get_lender_borrowers", { p_lender_id: profile.id }),
    supabase
      .from("loan_offers")
      .select(`
        loan_request:loan_requests(
          borrower_profile_id,
          borrower:profiles!loan_requests_borrower_profile_id_fkey(
            id,
            full_name,
            email,
            credit_score,
            country:countries(name, flag_emoji)
          )
        )
      `)
      .eq("lender_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
  ])

  // Deduplicate borrowers
  const uniqueBorrowers = new Map()
  recentBorrowers?.forEach((offer: any) => {
    const borrower = offer.loan_request?.borrower
    if (borrower && !uniqueBorrowers.has(borrower.id)) {
      uniqueBorrowers.set(borrower.id, borrower)
    }
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Borrowers</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Invite Borrower
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Search Borrowers
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Borrowers</h3>
          <p className="text-2xl font-bold mt-2">{connectedBorrowers?.length || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Loans</h3>
          <p className="text-2xl font-bold mt-2">
            {connectedBorrowers?.reduce((sum: number, b: any) => sum + (b.active_loans || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Reputation</h3>
          <p className="text-2xl font-bold mt-2">
            {connectedBorrowers && connectedBorrowers.length > 0
              ? Math.round(connectedBorrowers.reduce((sum: number, b: any) => sum + b.reputation_score, 0) / connectedBorrowers.length)
              : 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Connected Borrowers</h2>
        </div>
        <div className="p-6">
          {connectedBorrowers && connectedBorrowers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedBorrowers.map((borrower: any) => (
                <div key={borrower.borrower_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{borrower.full_name}</p>
                      <p className="text-sm text-gray-600">{borrower.email}</p>
                      <p className="text-sm text-gray-600">{borrower.country_name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      borrower.relationship_type === 'connected' ? 'bg-green-100 text-green-800' :
                      borrower.relationship_type === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {borrower.relationship_type || 'connected'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Reputation:</span>
                      <span className={`ml-1 font-medium ${
                        borrower.reputation_score >= 80 ? 'text-green-600' :
                        borrower.reputation_score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {borrower.reputation_score}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Active:</span>
                      <span className="ml-1 font-medium">{borrower.active_loans || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      View Profile
                    </button>
                    <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No connected borrowers yet</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Find Borrowers
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Borrowers</h2>
        </div>
        <div className="p-6">
          {uniqueBorrowers.size > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credit Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from(uniqueBorrowers.values()).map((borrower: any) => (
                    <tr key={borrower.id}>
                      <td className="px-4 py-2 text-sm">{borrower.full_name}</td>
                      <td className="px-4 py-2 text-sm">{borrower.email}</td>
                      <td className="px-4 py-2 text-sm">
                        {borrower.country?.flag_emoji} {borrower.country?.name}
                      </td>
                      <td className="px-4 py-2 text-sm">{borrower.credit_score || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">
                        <button className="text-blue-600 hover:text-blue-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent borrowers</p>
          )}
        </div>
      </div>
    </div>
  )
}