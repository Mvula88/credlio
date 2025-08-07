"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Ban, Search, AlertTriangle, User, Calendar, DollarSign, Loader2, Plus, CheckCircle, FileText } from "lucide-react"
import type { Blacklist, BorrowerReputation } from "@/lib/types/bureau"
import { DeregisterBorrowerDialog } from "@/components/lender/deregister-borrower-dialog"
import { useRouter } from "next/navigation"

interface BlacklistManagementProps {
  lenderId: string
  subscriptionTier: number
}

export function BlacklistManagement({ lenderId, subscriptionTier }: BlacklistManagementProps) {
  const [blacklists, setBlacklists] = useState<Blacklist[]>([])
  const [filteredBlacklists, setFilteredBlacklists] = useState<Blacklist[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [connectedBorrowers, setConnectedBorrowers] = useState<any[]>([])
  const [addingBlacklist, setAddingBlacklist] = useState(false)
  const [selectedForDeregistration, setSelectedForDeregistration] = useState<any>(null)
  const [showDeregisterDialog, setShowDeregisterDialog] = useState(false)
  const [formData, setFormData] = useState({
    borrower_id: "",
    reason: "missed_payments" as const,
    evidence: "",
    amount_defaulted: 0,
  })

  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const filtered = blacklists.filter(
      (blacklist) =>
        blacklist.borrower?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blacklist.borrower?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredBlacklists(filtered)
  }, [searchQuery, blacklists])

  async function fetchData() {
    try {
      // Try to fetch from blacklists table first
      let { data: blacklistData, error } = await supabase
        .from("blacklists")
        .select(
          `
          *,
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          ),
          blacklisted_by_profile:profiles!blacklisted_by(
            id,
            full_name,
            email,
            company_name
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })

      // If blacklists table doesn't exist or has an error, try blacklisted_borrowers
      if (error && error.code === '42P01') {
        const { data: altData } = await supabase
          .from("blacklisted_borrowers")
          .select(
            `
            *,
            borrower:profiles!borrower_profile_id(
              id,
              full_name,
              email
            ),
            lender:profiles!lender_profile_id(
              id,
              full_name,
              email,
              company_name
            )
          `
          )
          .eq("deregistered", false)
          .order("created_at", { ascending: false })

        // Map the alternative structure to match expected format
        blacklistData = altData?.map(item => ({
          ...item,
          borrower_id: item.borrower_profile_id,
          blacklisted_by: item.lender_profile_id,
          blacklisted_by_profile: item.lender,
          status: 'active',
          total_amount_defaulted: item.amount_owed,
          evidence: {
            reason_details: item.additional_notes
          }
        }))
      }

      // Group blacklists by borrower to count how many lenders reported each
      const borrowerReportCounts = new Map()
      blacklistData?.forEach(entry => {
        const borrowerId = entry.borrower_id
        if (!borrowerReportCounts.has(borrowerId)) {
          borrowerReportCounts.set(borrowerId, new Set())
        }
        borrowerReportCounts.get(borrowerId).add(entry.blacklisted_by)
      })

      // Add report count to each entry
      const enrichedData = blacklistData?.map(entry => ({
        ...entry,
        totalReports: borrowerReportCounts.get(entry.borrower_id)?.size || 1,
        reportingLenders: Array.from(borrowerReportCounts.get(entry.borrower_id) || [])
      }))

      setBlacklists(enrichedData || [])
      setFilteredBlacklists(enrichedData || [])

      // Fetch connected borrowers for add dialog
      const { data: connections } = await supabase
        .from("lender_borrower_connections")
        .select(
          `
          borrower:profiles!borrower_id(
            id,
            full_name,
            email
          )
        `
        )
        .eq("lender_id", lenderId)

      setConnectedBorrowers(connections?.map((c) => c.borrower) || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddBlacklist() {
    setAddingBlacklist(true)
    try {
      const evidence = {
        reason_details: formData.evidence,
        amount_defaulted: formData.amount_defaulted,
        reported_date: new Date().toISOString(),
      }

      const { error } = await supabase.from("blacklists").insert({
        borrower_id: formData.borrower_id,
        blacklisted_by: lenderId,
        reason: formData.reason,
        evidence,
        auto_generated: false,
        total_amount_defaulted: formData.amount_defaulted > 0 ? formData.amount_defaulted : null,
      })

      if (error) throw error

      // Update borrower reputation
      await supabase
        .from("borrower_reputation")
        .update({
          is_blacklisted: true,
          blacklist_count: supabase.sql`blacklist_count + 1`,
        })
        .eq("borrower_id", formData.borrower_id)

      // Refresh data
      await fetchData()
      setShowAddDialog(false)
      resetForm()
    } catch (error) {
      console.error("Error adding blacklist:", error)
      alert("Failed to add blacklist entry")
    } finally {
      setAddingBlacklist(false)
    }
  }

  function resetForm() {
    setFormData({
      borrower_id: "",
      reason: "missed_payments",
      evidence: "",
      amount_defaulted: 0,
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
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

  const getReasonBadge = (reason: string) => {
    const reasonMap: Record<string, { label: string; color: string }> = {
      missed_payments: { label: "Missed Payments", color: "bg-yellow-100 text-yellow-800" },
      fraud: { label: "Fraud", color: "bg-red-100 text-red-800" },
      false_information: { label: "False Information", color: "bg-orange-100 text-orange-800" },
      harassment: { label: "Harassment", color: "bg-purple-100 text-purple-800" },
      other: { label: "Other", color: "bg-gray-100 text-gray-800" },
    }
    const config = reasonMap[reason] || reasonMap.other
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Risky/Bad Borrowers List
              </CardTitle>
              <CardDescription>
                View borrowers reported as risky or bad by lenders and the system
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search blacklisted borrowers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Blacklist Entries */}
          {filteredBlacklists.length === 0 ? (
            <Alert>
              <AlertDescription>No blacklist entries found</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredBlacklists.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-lg">{entry.borrower?.full_name || "Unknown"}</p>
                            
                            {/* PROMINENT WARNING BADGE */}
                            <Badge className={`px-3 py-1 text-sm font-bold ${
                              entry.totalReports > 2 ? 'bg-red-600 text-white' :
                              entry.totalReports > 1 ? 'bg-orange-500 text-white' :
                              'bg-yellow-500 text-white'
                            }`}>
                              ⚠️ RISKY/BAD BORROWER - Listed by {entry.totalReports} {entry.totalReports === 1 ? 'lender' : 'lenders'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{entry.borrower?.email}</p>
                        </div>
                      </div>

                      {/* Warning Box */}
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                        <p className="text-sm font-semibold text-red-900">
                          ⚠️ This borrower has been reported as risky/bad by:
                        </p>
                        <p className="text-sm text-red-800 mt-1">
                          {entry.auto_generated ? (
                            "System (Automatic detection based on payment history)"
                          ) : (
                            `${entry.blacklisted_by_profile?.company_name || entry.blacklisted_by_profile?.full_name} ${
                              entry.totalReports > 1 ? `and ${entry.totalReports - 1} other lender(s)` : ''
                            }`
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getReasonBadge(entry.reason)}
                        {entry.auto_generated && <Badge variant="secondary">System Generated</Badge>}
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(entry.created_at)}
                        </Badge>
                      </div>

                      {entry.total_amount_defaulted && (
                        <div className="flex items-center gap-1 text-sm text-red-700 font-semibold">
                          <DollarSign className="h-3 w-3" />
                          <span>
                            {formatCurrency(entry.total_amount_defaulted)} defaulted
                          </span>
                        </div>
                      )}

                      {entry.evidence?.reason_details && (
                        <p className="mt-2 text-sm text-gray-700">
                          <strong>Details:</strong> {entry.evidence.reason_details}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Reported by</p>
                        <p className="text-sm font-medium">
                          {entry.auto_generated ? (
                            <span className="text-blue-600">System</span>
                          ) : (
                            entry.blacklisted_by_profile?.company_name || entry.blacklisted_by_profile?.full_name
                          )}
                        </p>
                      </div>
                      
                      {/* Deregister Button - Only show if this lender reported them or it's system-generated */}
                      {(entry.blacklisted_by === lenderId || entry.auto_generated) && !entry.deregistered && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                          onClick={() => {
                            setSelectedForDeregistration({
                              blacklistId: entry.id,
                              borrowerName: entry.borrower?.full_name || "Unknown",
                              amountOwed: entry.total_amount_defaulted || entry.amount_owed || 0
                            })
                            setShowDeregisterDialog(true)
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Remove from List
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Risky/bad borrower reports are visible to all lenders on the platform.
              The system also automatically flags borrowers based on payment history.
              Only add entries for serious violations with proper evidence.
            </AlertDescription>
          </Alert>

          {/* View Deregistration Requests Button */}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/lender/deregistration-requests")}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Deregistration Requests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Risky Borrower Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Risky/Bad Borrower</DialogTitle>
            <DialogDescription>
              Report a borrower who has defaulted or shown risky behavior. This will be visible to all lenders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Borrower</Label>
              <Select
                value={formData.borrower_id}
                onValueChange={(value) => setFormData({ ...formData, borrower_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a borrower" />
                </SelectTrigger>
                <SelectContent>
                  {connectedBorrowers.map((borrower) => (
                    <SelectItem key={borrower.id} value={borrower.id}>
                      {borrower.full_name} ({borrower.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value: any) => setFormData({ ...formData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missed_payments">Missed Payments</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="false_information">False Information</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reason === "missed_payments" && (
              <div>
                <Label>Amount Defaulted</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount_defaulted}
                  onChange={(e) =>
                    setFormData({ ...formData, amount_defaulted: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            )}

            <div>
              <Label>Evidence / Details</Label>
              <Textarea
                placeholder="Provide specific details about the violation..."
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBlacklist}
              disabled={!formData.borrower_id || !formData.evidence || addingBlacklist}
            >
              {addingBlacklist ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deregister Borrower Dialog */}
      {selectedForDeregistration && (
        <DeregisterBorrowerDialog
          blacklistId={selectedForDeregistration.blacklistId}
          borrowerName={selectedForDeregistration.borrowerName}
          amountOwed={selectedForDeregistration.amountOwed}
          open={showDeregisterDialog}
          onOpenChange={setShowDeregisterDialog}
          onSuccess={() => {
            fetchData()
            setSelectedForDeregistration(null)
          }}
        />
      )}
    </>
  )
}
