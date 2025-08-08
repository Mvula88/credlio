"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink
} from "lucide-react"
import { RequestDeregistrationDialog } from "@/components/lender/deregister-borrower-dialog"
import { format } from "date-fns"

interface RiskyStatusEntry {
  id: string
  borrower_profile_id: string
  lender_profile_id?: string
  amount_owed: number
  reason: string
  additional_notes?: string
  deregistered: boolean
  auto_generated: boolean
  created_at: string
  lender?: {
    full_name: string
    company_name?: string
  }
}

interface DeregistrationRequest {
  id: string
  status: "pending" | "approved" | "rejected"
  payment_amount: number
  payment_date: string
  lender_response?: string
  created_at: string
}

export function RiskyStatusNotification({ borrowerId }: { borrowerId: string }) {
  const [riskyEntries, setRiskyEntries] = useState<RiskyStatusEntry[]>([])
  const [deregistrationRequests, setDeregistrationRequests] = useState<DeregistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<RiskyStatusEntry | null>(null)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (borrowerId) {
      fetchRiskyStatus()
      fetchDeregistrationRequests()
    }
  }, [borrowerId])

  const fetchRiskyStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("blacklisted_borrowers")
        .select(`
          *,
          lender:profiles!lender_profile_id(
            full_name,
            company_name
          )
        `)
        .eq("borrower_profile_id", borrowerId)
        .eq("deregistered", false)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRiskyEntries(data || [])
    } catch (error) {
      console.error("Error fetching risky status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDeregistrationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("deregistration_requests")
        .select("*")
        .eq("borrower_profile_id", borrowerId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDeregistrationRequests(data || [])
    } catch (error) {
      console.error("Error fetching deregistration requests:", error)
    }
  }

  if (loading) {
    return null
  }

  if (riskyEntries.length === 0) {
    return null
  }

  const totalOwed = riskyEntries.reduce((sum, entry) => sum + (entry.amount_owed || 0), 0)
  const reportingLenders = new Set(riskyEntries.filter(e => e.lender_profile_id).map(e => e.lender_profile_id)).size
  const systemReports = riskyEntries.filter(e => e.auto_generated).length
  const pendingRequests = deregistrationRequests.filter(r => r.status === "pending")

  return (
    <>
      {/* Main Alert Banner */}
      <Alert className="mb-6 border-red-500 bg-red-50">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-900 font-bold text-lg">
          ⚠️ You are listed as a Risky/Bad Borrower
        </AlertTitle>
        <AlertDescription className="mt-2 text-red-800">
          <p className="mb-3">
            You have been reported by {reportingLenders > 0 && `${reportingLenders} lender${reportingLenders > 1 ? 's' : ''}`}
            {reportingLenders > 0 && systemReports > 0 && ' and '}
            {systemReports > 0 && `the system (${systemReports} automatic report${systemReports > 1 ? 's' : ''})`} 
            {' '}with a total outstanding amount of <strong>${totalOwed.toLocaleString()}</strong>.
          </p>
          <p className="mb-4">
            This status affects your ability to get new loans. Please clear your outstanding debts and request removal from this list.
          </p>
          
          <div className="flex gap-3">
            <Button 
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (riskyEntries.length === 1) {
                  setSelectedEntry(riskyEntries[0])
                  setShowRequestDialog(true)
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Request Removal After Payment
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const element = document.getElementById("risky-status-details")
                element?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              View Details
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Detailed Status Card */}
      <Card id="risky-status-details" className="border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Your Risk Status Details
          </CardTitle>
          <CardDescription>
            Review the reports against you and take action to clear your status
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-2">
                  You have {pendingRequests.length} pending deregistration request{pendingRequests.length > 1 ? 's' : ''}
                </p>
                {pendingRequests.map((request) => (
                  <div key={request.id} className="text-sm text-blue-800 mb-1">
                    • Payment of ${request.payment_amount.toLocaleString()} on {format(new Date(request.payment_date), "MMM dd, yyyy")} - Awaiting lender review
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Reports List */}
          <div className="space-y-4">
            {riskyEntries.map((entry) => (
              <div key={entry.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={entry.auto_generated ? "secondary" : "destructive"}>
                        {entry.auto_generated ? "System Report" : "Lender Report"}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {format(new Date(entry.created_at), "MMM dd, yyyy")}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {entry.amount_owed > 0 && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-600" />
                          <span className="font-semibold text-red-700">
                            Amount Owed: ${entry.amount_owed.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Reason: {entry.reason.replace(/_/g, ' ')}</p>
                          {entry.additional_notes && (
                            <p className="text-sm text-gray-600 mt-1">{entry.additional_notes}</p>
                          )}
                        </div>
                      </div>
                      
                      {entry.lender && (
                        <p className="text-sm text-gray-600">
                          Reported by: <strong>{entry.lender.company_name || entry.lender.full_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Request Deregistration Button for Each Entry */}
                  {!entry.deregistered && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-4"
                      onClick={() => {
                        setSelectedEntry(entry)
                        setShowRequestDialog(true)
                      }}
                    >
                      Request Removal
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Approved/Rejected Requests History */}
          {deregistrationRequests.filter(r => r.status !== "pending").length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Request History</h4>
              <div className="space-y-2">
                {deregistrationRequests
                  .filter(r => r.status !== "pending")
                  .map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        {request.status === "approved" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            ${request.payment_amount.toLocaleString()} - {format(new Date(request.payment_date), "MMM dd, yyyy")}
                          </p>
                          {request.lender_response && (
                            <p className="text-xs text-gray-600">{request.lender_response}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={request.status === "approved" ? "success" : "destructive"}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Action Box */}
          <Alert className="mt-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900 mb-2">How to Clear Your Status:</p>
              <ol className="list-decimal list-inside text-sm text-green-800 space-y-1">
                <li>Pay your outstanding debts to the lenders</li>
                <li>Collect payment proof (receipts, transaction IDs)</li>
                <li>Click "Request Removal" and submit your payment details</li>
                <li>Wait for lender approval (usually within 24-48 hours)</li>
                <li>Once approved, your status will be cleared automatically</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Request Deregistration Dialog */}
      {selectedEntry && (
        <RequestDeregistrationDialog
          blacklistId={selectedEntry.id}
          open={showRequestDialog}
          onOpenChange={setShowRequestDialog}
          onSuccess={() => {
            fetchDeregistrationRequests()
            setSelectedEntry(null)
          }}
        />
      )}
    </>
  )
}