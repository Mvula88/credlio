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
import { Ban, Search, AlertTriangle, User, Calendar, DollarSign, Loader2, Plus } from "lucide-react"
import type { Blacklist, BorrowerReputation } from "@/lib/types/bureau"

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
  const [formData, setFormData] = useState({
    borrower_id: "",
    reason: "missed_payments" as const,
    evidence: "",
    amount_defaulted: 0,
  })

  const supabase = createClientComponentClient()

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
      // Fetch all blacklists (not just own)
      const { data: blacklistData } = await supabase
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
            email
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })

      setBlacklists(blacklistData || [])
      setFilteredBlacklists(blacklistData || [])

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
                <Ban className="h-5 w-5" />
                Blacklist Management
              </CardTitle>
              <CardDescription>
                View and manage blacklisted borrowers across the platform
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
                          <User className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">{entry.borrower?.full_name || "Unknown"}</p>
                          <p className="text-sm text-gray-600">{entry.borrower?.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getReasonBadge(entry.reason)}
                        {entry.auto_generated && <Badge variant="secondary">Auto-Generated</Badge>}
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(entry.created_at)}
                        </Badge>
                      </div>

                      {entry.total_amount_defaulted && (
                        <div className="flex items-center gap-1 text-sm text-red-700">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">
                            {formatCurrency(entry.total_amount_defaulted)} defaulted
                          </span>
                        </div>
                      )}

                      {entry.evidence?.reason_details && (
                        <p className="mt-2 text-sm text-gray-700">
                          {entry.evidence.reason_details}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Reported by</p>
                      <p className="text-sm font-medium">
                        {entry.blacklisted_by_profile?.full_name || "System"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Blacklist entries are visible to all lenders on the platform.
              Only add entries for serious violations with proper evidence.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Add Blacklist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blacklist Entry</DialogTitle>
            <DialogDescription>
              Report a borrower for serious violations. This will be visible to all lenders.
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
    </>
  )
}
