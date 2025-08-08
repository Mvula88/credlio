"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Users, Ban, Ghost, Shield } from "lucide-react"
import type { BorrowerReputation } from "@/lib/types/reputation"

export function BorrowerReputationCard({ borrowerId }: { borrowerId: string }) {
  const [reputation, setReputation] = useState<BorrowerReputation | null>(null)
  const [riskCounts, setRiskCounts] = useState({
    blacklisted: 0,
    risky: 0,
    off_platform: 0,
    ghost_defaulted: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchReputation() {
      try {
        // Fetch reputation
        const { data, error } = await supabase.rpc("get_borrower_reputation", {
          p_borrower_id: borrowerId,
        })

        if (error) throw error
        setReputation(data)

        // Fetch risk counts
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone_number")
          .eq("id", borrowerId)
          .single()

        if (profileData) {
          const { data: riskData } = await supabase.rpc("get_person_risk_summary", {
            p_full_name: profileData.full_name,
            p_phone_number: profileData.phone_number
          })

          if (riskData) {
            const counts = {
              blacklisted: 0,
              risky: 0,
              off_platform: 0,
              ghost_defaulted: 0,
              total: 0
            }

            riskData.forEach((risk: any) => {
              counts[risk.risk_type as keyof typeof counts] = risk.report_count
              counts.total += risk.report_count
            })

            setRiskCounts(counts)
          }
        }
      } catch (error) {
        console.error("Error fetching reputation:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReputation()
  }, [borrowerId, supabase])

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading reputation data...</div>
  }

  if (!reputation) {
    return (
      <div className="py-8 text-center text-muted-foreground">No reputation data available</div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Poor"
  }

  return (
    <div className="space-y-6">
      {/* Risk Warnings */}
      {riskCounts.total > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-red-800">
                This borrower has been reported {riskCounts.total} time{riskCounts.total > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {riskCounts.blacklisted > 0 && (
                  <Badge variant="destructive" className="justify-start">
                    <Ban className="mr-1 h-3 w-3" />
                    Blacklisted ({riskCounts.blacklisted})
                  </Badge>
                )}
                {riskCounts.risky > 0 && (
                  <Badge className="bg-orange-100 text-orange-800 justify-start">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Risky ({riskCounts.risky})
                  </Badge>
                )}
                {riskCounts.off_platform > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 justify-start">
                    <Users className="mr-1 h-3 w-3" />
                    Off-Platform ({riskCounts.off_platform})
                  </Badge>
                )}
                {riskCounts.ghost_defaulted > 0 && (
                  <Badge className="bg-purple-100 text-purple-800 justify-start">
                    <Ghost className="mr-1 h-3 w-3" />
                    Ghost Default ({riskCounts.ghost_defaulted})
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Blacklist Warning */}
      {reputation.is_blacklisted && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Blacklisted Borrower
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reputation.blacklist_details?.map((blacklist, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium text-red-700">
                    Reason: {blacklist.reason.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p className="text-red-600">
                    By: {blacklist.is_system ? "System (Auto)" : blacklist.blacklisted_by}
                  </p>
                  <p className="text-xs text-red-600">
                    Date: {new Date(blacklist.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reputation Score */}
      <Card>
        <CardHeader>
          <CardTitle>Reputation Score</CardTitle>
          <CardDescription>Overall borrower trustworthiness rating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${getScoreColor(reputation.reputation_score)}`}>
                  {reputation.reputation_score.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getScoreLabel(reputation.reputation_score)}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${getScoreColor(reputation.reputation_score)}`} />
            </div>
            <Progress value={reputation.reputation_score} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Loan Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
          <CardDescription>Historical borrowing behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Loans</p>
              <p className="text-2xl font-semibold">{reputation.total_loans}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold text-green-600">{reputation.completed_loans}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold text-blue-600">{reputation.active_loans}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Defaulted</p>
              <p className="text-2xl font-semibold text-red-600">{reputation.defaulted_loans}</p>
            </div>
          </div>

          {reputation.total_loans > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">On-time Payment Rate</span>
                <span className="text-sm font-bold">{reputation.on_time_rate}%</span>
              </div>
              <Progress value={reputation.on_time_rate} className="mt-2 h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Behaviors */}
      {reputation.recent_behaviors && reputation.recent_behaviors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payment Behaviors</CardTitle>
            <CardDescription>Last 10 payment records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reputation.recent_behaviors.map((behavior, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b py-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {behavior.behavior_type === "on_time" || behavior.behavior_type === "early" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : behavior.behavior_type === "late" ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium capitalize">
                      {behavior.behavior_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(behavior.due_date).toLocaleDateString()}
                    </p>
                    {behavior.days_late > 0 && (
                      <p className="text-xs text-red-600">{behavior.days_late} days late</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
