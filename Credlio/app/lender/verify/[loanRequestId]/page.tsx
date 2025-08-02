"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Home,
  Briefcase,
  FileText,
  Shield,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  AlertTriangle
} from "lucide-react"
import { DocumentVerificationPanel } from "@/components/lender/document-verification-panel"
import { 
  DOCUMENT_CATEGORIES, 
  getDocumentsByCategory,
  type DocumentCategory 
} from "@/lib/constants/document-requirements"

export default function VerificationPage() {
  const params = useParams()
  const router = useRouter()
  const loanRequestId = params.loanRequestId as string
  
  const [loading, setLoading] = useState(true)
  const [loanRequest, setLoanRequest] = useState<any>(null)
  const [borrowerProfile, setBorrowerProfile] = useState<any>(null)
  const [verificationStatus, setVerificationStatus] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<DocumentCategory>("identity")

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

        // Fetch verification status
        await fetchVerificationStatus(loanData.borrower.id)
      }
    } catch (error) {
      console.error("Error fetching loan request:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchVerificationStatus(borrowerId: string) {
    const { data } = await supabase
      .from("document_verifications")
      .select("*")
      .eq("user_id", borrowerId)
      .order("created_at", { ascending: false })

    setVerificationStatus(data || [])
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return <CreditCard className="h-5 w-5" />
      case 'income': return <DollarSign className="h-5 w-5" />
      case 'address': return <Home className="h-5 w-5" />
      case 'employment': return <Briefcase className="h-5 w-5" />
      case 'additional': return <FileText className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
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
            <h1 className="text-2xl font-bold">Document Verification</h1>
            <p className="text-muted-foreground">
              Verify borrower documents for loan request #{loanRequestId.slice(0, 8)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Shield className="h-4 w-4 mr-2" />
          Secure Verification
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Borrower Info */}
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

              {/* Risk Indicators */}
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Risk Indicators</p>
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
                <span className="text-sm text-muted-foreground">Purpose</span>
                <Badge variant="outline">{loanRequest?.purpose}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Document Verification */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Verification Center</CardTitle>
                <Alert className="w-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Documents are verified in real-time and never stored
                  </AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            <CardContent>
              {/* Category Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentCategory)}>
                <TabsList className="grid grid-cols-5 w-full">
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="gap-2">
                      {getCategoryIcon(category.id)}
                      <span className="hidden sm:inline">{category.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Document Verification Panels by Category */}
                {DOCUMENT_CATEGORIES.map((category) => (
                  <TabsContent key={category.id} value={category.id} className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          {getCategoryIcon(category.id)}
                          {category.name}
                        </h3>
                        <Badge variant="outline">
                          {getDocumentsByCategory(category.id as DocumentCategory).filter(d => d.required).length} Required
                        </Badge>
                      </div>
                      
                      <DocumentVerificationPanel
                        borrowerId={borrowerProfile?.id}
                        loanRequestId={loanRequestId}
                        category={category.id as DocumentCategory}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
                <Button>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}