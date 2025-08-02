"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, User, Calendar } from "lucide-react"
import type { Blacklist } from "@/lib/types/reputation"

export function BlacklistedBorrowersSection() {
  const [blacklists, setBlacklists] = useState<Blacklist[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchBlacklists() {
      try {
        const { data, error } = await supabase
          .from("blacklists")
          .select(
            `
            *,
            borrower:profiles!blacklists_borrower_id_fkey(
              id,
              full_name,
              email
            ),
            blacklisted_by_profile:profiles!blacklists_blacklisted_by_fkey(
              id,
              full_name,
              email
            )
          `
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) throw error
        setBlacklists(data || [])
      } catch (error) {
        console.error("Error fetching blacklists:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBlacklists()
  }, [supabase])

  const getReasonBadge = (reason: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      repeated_defaults: { label: "Repeated Defaults", className: "bg-red-100 text-red-800" },
      fraud: { label: "Fraud", className: "bg-red-100 text-red-800" },
      false_information: { label: "False Information", className: "bg-orange-100 text-orange-800" },
      harassment: { label: "Harassment", className: "bg-purple-100 text-purple-800" },
      other: { label: "Other", className: "bg-gray-100 text-gray-800" },
    }
    const variant = variants[reason] || variants.other
    return <Badge className={variant.className}>{variant.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Blacklisted Borrowers
            </CardTitle>
            <CardDescription>
              Borrowers flagged for poor repayment behavior or violations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        ) : blacklists.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No blacklisted borrowers found
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {blacklists.map((blacklist) => (
                <div key={blacklist.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {blacklist.borrower?.full_name || "Unknown Borrower"}
                        </span>
                        {blacklist.is_system_generated && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{blacklist.borrower?.email}</p>
                    </div>
                    {getReasonBadge(blacklist.reason)}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">{blacklist.details}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(blacklist.created_at).toLocaleDateString()}
                      </span>
                      {!blacklist.is_system_generated && (
                        <span>By: {blacklist.blacklisted_by_profile?.full_name || "Unknown"}</span>
                      )}
                    </div>
                  </div>

                  {blacklist.evidence && (
                    <div className="mt-2 rounded bg-gray-50 p-2 text-xs">
                      <strong>Evidence:</strong> {blacklist.evidence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
