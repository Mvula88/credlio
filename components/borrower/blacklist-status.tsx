"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ban, Calendar, DollarSign, AlertTriangle, User, CheckCircle } from "lucide-react"
import type { Blacklist } from "@/lib/types/bureau"

interface BorrowerBlacklistStatusProps {
  borrowerId: string
}

export function BorrowerBlacklistStatus({ borrowerId }: BorrowerBlacklistStatusProps) {
  const [blacklistEntries, setBlacklistEntries] = useState<Blacklist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchBlacklistStatus()
  }, [borrowerId])

  async function fetchBlacklistStatus() {
    try {
      const { data } = await supabase
        .from("blacklists")
        .select(
          `
          *,
          blacklisted_by_profile:profiles!blacklisted_by(
            id,
            full_name,
            email
          )
        `
        )
        .eq("borrower_id", borrowerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      setBlacklistEntries(data || [])
    } catch (error) {
      console.error("Error fetching blacklist status:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      missed_payments: "Missed Payments",
      fraud: "Fraud",
      false_information: "False Information",
      harassment: "Harassment",
      other: "Other",
    }
    return reasons[reason] || reason
  }

  if (loading || blacklistEntries.length === 0) {
    return null
  }

  return (
    <Alert className="border-red-300 bg-red-50">
      <Ban className="h-5 w-5 text-red-600" />
      <AlertDescription className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-red-800">You are currently blacklisted</p>
          <p className="text-red-700">
            This status severely impacts your ability to access loans from lenders on this platform.
          </p>
        </div>

        <div className="space-y-3">
          {blacklistEntries.map((entry) => (
            <Card key={entry.id} className="border-red-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{getReasonText(entry.reason)}</CardTitle>
                    <CardDescription>
                      Reported by {entry.blacklisted_by_profile?.full_name || "System"}
                    </CardDescription>
                  </div>
                  {entry.auto_generated && <Badge variant="secondary">Auto-Generated</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>Date: {formatDate(entry.created_at)}</span>
                </div>

                {entry.total_amount_defaulted && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-3 w-3" />
                    <span>Amount Defaulted: {formatCurrency(entry.total_amount_defaulted)}</span>
                  </div>
                )}

                {entry.missed_payment_count && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Missed Payments: {entry.missed_payment_count}</span>
                  </div>
                )}

                {entry.evidence?.reason_details && (
                  <p className="border-t pt-2 text-sm text-gray-700">
                    {entry.evidence.reason_details}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-md bg-red-100 p-3">
          <p className="mb-2 text-sm font-medium text-red-800">To resolve your blacklist status:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
            <li>Clear all outstanding loan payments</li>
            <li>Contact the lender(s) who reported you</li>
            <li>Maintain good payment behavior going forward</li>
            <li>Wait for the blacklist period to expire</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )
}
