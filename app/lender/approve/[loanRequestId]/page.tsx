"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Clock,
  FileText,
  Shield,
  AlertCircle
} from "lucide-react"
import { LoanApprovalChecklist } from "@/components/lender/loan-approval-checklist"
import { toast } from "sonner"

export default function LoanApprovalPage() {
  const params = useParams()
  const router = useRouter()
  const loanRequestId = params.loanRequestId as string
  
  const [loading, setLoading] = useState(true)
  const [loanRequest, setLoanRequest] = useState<any>(null)
  const [borrowerProfile, setBorrowerProfile] = useState<any>(null)
  const [riskStatus, setRiskStatus] = useState<any>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchLoanRequestData()
  }, [loanRequestId])

  async function fetchLoanRequestData() {
    try {
      // Fetch loan request with borrower info
      const { data: loanData } = await supabase
        .from("loan_requests")
        .select(`
          *,
          borrower:profiles!loan_requests_borrower_id_fkey(
            id,
            full_name,
            email,
            phone,
            username,
            created_at,
            country:countries(name, flag)
          )
        `)
        .eq("id", loanRequestId)
        .single()

      if (loanData) {
        setLoanRequest(loanData)
        setBorrowerProfile(loanData.borrower)
        
        // Fetch borrower additional info
        const { data: borrowerData } = await supabase
          .from("borrower_profiles")
          .select("*")
          .eq("user_id", loanData.borrower.id)
          .single()

        if (borrowerData) {
          setBorrowerProfile(prev => ({ ...prev, ...borrowerData }))
        }

        // Check borrower risk status
        const { data: blacklistData } = await supabase
          .from("blacklisted_borrowers")
          .select("*")
          .eq("borrower_id", loanData.borrower.id)
          .eq("is_active", true)
          .single()

        if (blacklistData) {
          setRiskStatus({
            isBlacklisted: true,
            reason: blacklistData.reason,
            blacklistedAt: blacklistData.blacklisted_at
          })
        }

        // Check if borrower is marked as risky
        const { data: riskyData } = await supabase
          .from("risky_borrowers")
          .select("*")
          .eq("borrower_id", loanData.borrower.id)
          .eq("is_active", true)
          .single()

        if (riskyData) {
          setRiskStatus(prev => ({
            ...prev,
            isRisky: true,
            riskLevel: riskyData.risk_level,
            flags: riskyData.risk_flags
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching loan request:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      // Update loan request status
      await supabase
        .from("loan_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", loanRequestId)

      // Create loan record
      const { data: { user } } = await supabase.auth.getUser()
      const { data: lenderProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single()

      if (lenderProfile) {
        await supabase.from("loans").insert({
          loan_request_id: loanRequestId,
          lender_id: lenderProfile.id,
          borrower_id: borrowerProfile.id,
          amount: loanRequest.amount,
          currency: loanRequest.currency,
          interest_rate: loanRequest.interest_rate,
          duration_days: loanRequest.duration,
          repayment_date: calculateRepaymentDate(loanRequest.duration),
          status: "active"
        })
      }

      toast.success("Loan approved successfully!")
      router.push("/lender/dashboard")
    } catch (error) {
      console.error("Error approving loan:", error)
      toast.error("Error approving loan")
    }
  }

  const handleReject = async () => {
    try {
      await supabase
        .from("loan_requests")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString()
        })
        .eq("id", loanRequestId)

      toast.success("Loan request rejected")
      router.push("/lender/marketplace")
    } catch (error) {
      console.error("Error rejecting loan:", error)
      toast.error("Error rejecting loan")
    }
  }

  const calculateRepaymentDate = (durationDays: number) => {
    const date = new Date()
    date.setDate(date.getDate() + durationDays)
    return date.toISOString()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!loanRequest) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Loan request not found
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Loan Approval</h1>
            <p className="text-muted-foreground">
              Review and approve loan request #{loanRequestId.slice(0, 8)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Shield className="h-4 w-4 mr-2" />
          Secure Approval Process
        </Badge>
      </div>

      {/* Risk Warnings */}
      {riskStatus?.isBlacklisted && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This borrower is blacklisted. 
            Reason: {riskStatus.reason}. 
            Blacklisted on: {new Date(riskStatus.blacklistedAt).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      {riskStatus?.isRisky && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Caution:</strong> This borrower has been flagged as risky. 
            Risk level: {riskStatus.riskLevel}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Borrower & Loan Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Borrower Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Borrower Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{borrowerProfile?.full_name}</p>
                <p className="text-sm text-muted-foreground">@{borrowerProfile?.username}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{borrowerProfile?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{borrowerProfile?.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="flex items-center gap-1">
                    <span>{borrowerProfile?.country?.flag}</span>
                    <span>{borrowerProfile?.country?.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Member since {new Date(borrowerProfile?.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Credit History */}
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Credit History</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Reputation Score</span>
                    <Badge variant={borrowerProfile?.reputation_score > 70 ? "default" : "secondary"}>
                      {borrowerProfile?.reputation_score || 0}/100
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Active Loans</span>
                    <span className="font-medium">{borrowerProfile?.active_loans || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Completed Loans</span>
                    <span className="font-medium">{borrowerProfile?.completed_loans || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Default Rate</span>
                    <span className="font-medium">
                      {borrowerProfile?.default_rate || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Loan Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">
                  {loanRequest?.currency} {loanRequest?.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{loanRequest?.duration} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Interest Rate</span>
                <span className="font-medium">{loanRequest?.interest_rate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Repayment</span>
                <span className="font-semibold">
                  {loanRequest?.currency} {(loanRequest?.amount * (1 + loanRequest?.interest_rate / 100)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Purpose</span>
                <Badge variant="outline">{loanRequest?.purpose}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Repayment Date</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(calculateRepaymentDate(loanRequest?.duration)).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Approval Checklist */}
        <div className="lg:col-span-2">
          <LoanApprovalChecklist
            loanRequestId={loanRequestId}
            borrowerId={borrowerProfile?.id}
            borrowerName={borrowerProfile?.full_name}
            loanAmount={loanRequest?.amount}
            currency={loanRequest?.currency}
            repaymentDate={new Date(calculateRepaymentDate(loanRequest?.duration)).toLocaleDateString()}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  )
}