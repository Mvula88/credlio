"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  FileText,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Loader2
} from "lucide-react"
import { format } from "date-fns"

interface DeregistrationRequest {
  id: string
  blacklist_entry_id: string
  borrower_profile_id: string
  payment_amount: number
  payment_date: string
  payment_reference?: string
  payment_proof_url?: string
  borrower_message?: string
  lender_response?: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  borrower?: {
    id: string
    full_name: string
    email: string
  }
  blacklist?: {
    id: string
    reason: string
    amount_owed: number
  }
}

export default function DeregistrationRequestsPage() {
  const [requests, setRequests] = useState<DeregistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<DeregistrationRequest | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalResponse, setApprovalResponse] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending")
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRequests(activeTab)
  }, [activeTab])

  const fetchRequests = async (status: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/borrowers/deregister?status=${status}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      } else {
        console.error("Failed to fetch requests")
        toast.error("Failed to fetch deregistration requests")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Error loading requests")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    setIsApproving(true)
    try {
      const response = await fetch("/api/borrowers/deregister", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          response: approvalResponse || "Request approved"
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve request")
      }

      toast.success("Deregistration request approved successfully")
      setShowApprovalDialog(false)
      setSelectedRequest(null)
      setApprovalResponse("")
      
      // Refresh the list
      fetchRequests(activeTab)
    } catch (error) {
      console.error("Approval error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to approve request")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async (request: DeregistrationRequest, reason: string) => {
    try {
      // Update request status to rejected
      const { error } = await supabase
        .from("deregistration_requests")
        .update({
          status: "rejected",
          lender_response: reason,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", request.id)

      if (error) throw error

      toast.success("Request rejected")
      fetchRequests(activeTab)
    } catch (error) {
      console.error("Rejection error:", error)
      toast.error("Failed to reject request")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Deregistration Requests</CardTitle>
          <CardDescription>
            Review and manage borrower requests to be removed from the risky borrowers list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                <Clock className="w-4 h-4 mr-2" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="approved">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approved
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <XCircle className="w-4 h-4 mr-2" />
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No {activeTab} requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Payment Details</TableHead>
                      <TableHead>Amount Owed</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.borrower?.full_name}</p>
                            <p className="text-sm text-gray-500">{request.borrower?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">
                                ${request.payment_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">
                                {format(new Date(request.payment_date), "MMM dd, yyyy")}
                              </span>
                            </div>
                            {request.payment_reference && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{request.payment_reference}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-red-600">
                            ${request.blacklist?.amount_owed?.toLocaleString() || "0"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {request.payment_proof_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(request.payment_proof_url, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            {request.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setShowApprovalDialog(true)
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt("Reason for rejection:")
                                    if (reason) {
                                      handleReject(request, reason)
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedRequest(request)}
                            >
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Deregistration Request</DialogTitle>
            <DialogDescription>
              Confirm that {selectedRequest?.borrower?.full_name} has cleared their debt
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Borrower:</span>
                  <span className="text-sm font-medium">{selectedRequest.borrower?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Amount:</span>
                  <span className="text-sm font-medium">${selectedRequest.payment_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Date:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(selectedRequest.payment_date), "MMM dd, yyyy")}
                  </span>
                </div>
                {selectedRequest.borrower_message && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Borrower's Message:</p>
                    <p className="text-sm mt-1">{selectedRequest.borrower_message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">Response Message (Optional)</Label>
                <Textarea
                  id="response"
                  placeholder="Add a message for the borrower..."
                  value={approvalResponse}
                  onChange={(e) => setApprovalResponse(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">This action will:</p>
                    <ul className="mt-1 text-green-800 space-y-1">
                      <li>• Remove {selectedRequest.borrower?.full_name} from the risky list</li>
                      <li>• Notify them of the approval</li>
                      <li>• Improve their risk score</li>
                      <li>• Allow them to access loans again</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve & Remove
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedRequest && !showApprovalDialog && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Borrower Information</Label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm"><strong>Name:</strong> {selectedRequest.borrower?.full_name}</p>
                    <p className="text-sm"><strong>Email:</strong> {selectedRequest.borrower?.email}</p>
                    <p className="text-sm"><strong>ID:</strong> {selectedRequest.borrower_profile_id}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Payment Information</Label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm"><strong>Amount:</strong> ${selectedRequest.payment_amount.toLocaleString()}</p>
                    <p className="text-sm"><strong>Date:</strong> {format(new Date(selectedRequest.payment_date), "MMM dd, yyyy")}</p>
                    {selectedRequest.payment_reference && (
                      <p className="text-sm"><strong>Reference:</strong> {selectedRequest.payment_reference}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedRequest.borrower_message && (
                <div>
                  <Label>Borrower's Message</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{selectedRequest.borrower_message}</p>
                  </div>
                </div>
              )}

              {selectedRequest.lender_response && (
                <div>
                  <Label>Lender's Response</Label>
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">{selectedRequest.lender_response}</p>
                  </div>
                </div>
              )}

              {selectedRequest.payment_proof_url && (
                <div>
                  <Label>Payment Proof</Label>
                  <Button
                    className="mt-2"
                    variant="outline"
                    onClick={() => window.open(selectedRequest.payment_proof_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Payment Proof
                  </Button>
                </div>
              )}

              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}