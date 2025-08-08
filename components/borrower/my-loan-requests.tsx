"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, DollarSign, Calendar, Clock, AlertTriangle, Loader2, Edit, X } from "lucide-react"
import type { LoanRequest, BorrowerReputation } from "@/lib/types/bureau"

interface MyLoanRequestsProps {
  borrowerId: string
}

export function MyLoanRequests({ borrowerId }: MyLoanRequestsProps) {
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [reputation, setReputation] = useState<BorrowerReputation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    amount: 0,
    purpose: "",
    description: "",
    repayment_period: 30,
    monthly_income: 0,
    employment_status: "employed" as const,
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [borrowerId])

  async function fetchData() {
    try {
      // Fetch loan requests
      const { data: requestsData } = await supabase
        .from("loan_requests")
        .select("*")
        .eq("borrower_id", borrowerId)
        .order("created_at", { ascending: false })

      setRequests(requestsData || [])

      // Fetch reputation
      const { data: repData } = await supabase
        .from("borrower_reputation")
        .select("*")
        .eq("borrower_id", borrowerId)
        .single()

      setReputation(repData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateRequest() {
    setCreating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const { error } = await supabase.from("loan_requests").insert({
        borrower_id: borrowerId,
        amount: formData.amount,
        currency: "USD",
        purpose: formData.purpose,
        description: formData.description,
        repayment_period: formData.repayment_period,
        monthly_income: formData.monthly_income,
        employment_status: formData.employment_status,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      await fetchData()
      setShowCreateDialog(false)
      resetForm()
    } catch (error) {
      console.error("Error creating request:", error)
      alert("Failed to create loan request")
    } finally {
      setCreating(false)
    }
  }

  async function handleCancelRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from("loan_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error("Error cancelling request:", error)
    }
  }

  function resetForm() {
    setFormData({
      amount: 0,
      purpose: "",
      description: "",
      repayment_period: 30,
      monthly_income: 0,
      employment_status: "employed",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: "Active", color: "bg-green-100 text-green-800" },
      matched: { label: "Matched", color: "bg-blue-100 text-blue-800" },
      fulfilled: { label: "Fulfilled", color: "bg-purple-100 text-purple-800" },
      cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
      expired: { label: "Expired", color: "bg-red-100 text-red-800" },
    }

    const { label, color } = config[status as keyof typeof config] || config.active
    return <Badge className={color}>{label}</Badge>
  }

  const canCreateRequest = () => {
    // Check if user is blacklisted
    if (reputation?.is_blacklisted) return false

    // Check if reputation score is too low
    if (reputation && reputation.reputation_score < 20) return false

    // Check if there are too many active requests
    const activeRequests = requests.filter((r) => r.status === "active").length
    if (activeRequests >= 3) return false

    return true
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
              <CardTitle>My Loan Requests</CardTitle>
              <CardDescription>
                Create and manage your loan requests for lenders to see
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} disabled={!canCreateRequest()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!canCreateRequest() && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {reputation?.is_blacklisted
                  ? "You cannot create loan requests while blacklisted"
                  : reputation && reputation.reputation_score < 20
                    ? "Your reputation score is too low to create requests"
                    : "You have reached the maximum number of active requests (3)"}
              </AlertDescription>
            </Alert>
          )}

          {requests.length === 0 ? (
            <Alert>
              <AlertDescription>You haven't created any loan requests yet</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {formatCurrency(request.amount)} - {request.purpose}
                        </CardTitle>
                        <CardDescription>
                          Created on {formatDate(request.created_at)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {request.description && (
                      <p className="mb-3 text-sm text-gray-700">{request.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(request.amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Repayment Period</p>
                        <p className="font-medium">{request.repayment_period} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly Income</p>
                        <p className="font-medium">{formatCurrency(request.monthly_income || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium">{formatDate(request.expires_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Loan Request</DialogTitle>
            <DialogDescription>
              Create a loan request that will be visible to verified lenders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Loan Amount</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Purpose</Label>
              <Input
                placeholder="e.g., Business expansion, Medical emergency"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Provide more details about why you need this loan..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Repayment Period (days)</Label>
              <Input
                type="number"
                value={formData.repayment_period}
                onChange={(e) =>
                  setFormData({ ...formData, repayment_period: parseInt(e.target.value) || 30 })
                }
              />
            </div>

            <div>
              <Label>Monthly Income</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.monthly_income}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_income: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Employment Status</Label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={formData.employment_status}
                onChange={(e) =>
                  setFormData({ ...formData, employment_status: e.target.value as any })
                }
              >
                <option value="employed">Employed</option>
                <option value="self_employed">Self Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={!formData.amount || !formData.purpose || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
