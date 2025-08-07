import { getCurrentUserProfile } from "@/lib/supabase/auth-helpers"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function BorrowerReputationPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "borrower") {
    redirect("/auth/signin")
  }

  const supabase = createServerSupabaseClient()
  
  const [
    { data: reputationData },
    { data: badges },
    { data: recentActivity }
  ] = await Promise.all([
    supabase.rpc("get_borrower_reputation", { borrower_id: profile.id }),
    supabase
      .from("reputation_badges")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("is_active", true),
    supabase
      .from("loan_payments")
      .select(`
        *,
        loan_offer:loan_offers(
          offered_amount,
          interest_rate
        )
      `)
      .eq("borrower_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10)
  ])

  const reputationScore = reputationData?.reputation_score || 50
  const scoreColor = reputationScore >= 80 ? 'text-green-600' : reputationScore >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Reputation</h1>
      
      <div className="bg-white rounded-lg shadow p-8 mb-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-600 mb-4">Reputation Score</h2>
          <div className={`text-6xl font-bold ${scoreColor} mb-4`}>
            {reputationScore}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full ${
                reputationScore >= 80 ? 'bg-green-600' : reputationScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${reputationScore}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            {reputationScore >= 80 ? 'Excellent standing' : reputationScore >= 60 ? 'Good standing' : 'Needs improvement'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Loans</h3>
          <p className="text-2xl font-bold mt-2">{reputationData?.total_loans || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">On-Time Payments</h3>
          <p className="text-2xl font-bold mt-2">{reputationData?.on_time_payments || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Payment Rate</h3>
          <p className="text-2xl font-bold mt-2">{reputationData?.payment_rate || 0}%</p>
        </div>
      </div>

      {badges && badges.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Achievement Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge: any) => (
              <div key={badge.id} className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">
                    {badge.badge_type === 'star' ? '⭐' : 
                     badge.badge_type === 'shield' ? '🛡️' : 
                     badge.badge_type === 'zap' ? '⚡' : '🎯'}
                  </span>
                </div>
                <p className="text-sm font-medium">{badge.badge_name}</p>
                <p className="text-xs text-gray-600">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="p-6">
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">Payment of ${activity.amount_paid}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How to Improve Your Reputation</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make all loan payments on time</li>
          <li>• Complete your profile verification</li>
          <li>• Maintain consistent payment history</li>
          <li>• Build relationships with trusted lenders</li>
        </ul>
      </div>
    </div>
  )
}