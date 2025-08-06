"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Users,
  Search,
  Filter,
  Star,
  Shield,
  Clock,
  DollarSign,
  TrendingUp,
  Globe,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  Calendar,
  MapPin,
  Building,
  UserCheck,
  Info
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface MarketplaceClientProps {
  loanRequests: any[]
  isPremium: boolean
}

export function MarketplaceClient({ loanRequests, isPremium }: MarketplaceClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCountry, setFilterCountry] = useState("all")
  const [filterAmount, setFilterAmount] = useState("all")
  const [filterPurpose, setFilterPurpose] = useState("all")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  if (!isPremium) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="mt-2 text-gray-600">
            Browse and connect with verified borrowers
          </p>
        </div>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
                <CardDescription className="text-base">
                  Unlock marketplace access and connect with verified borrowers seeking loans
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Smart Matching</p>
                  <p className="text-sm text-gray-600">
                    AI-powered borrower matching based on your lending criteria
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Verified Borrowers</p>
                  <p className="text-sm text-gray-600">
                    Access to pre-verified borrowers with credit history
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited Access</p>
                  <p className="text-sm text-gray-600">
                    Browse unlimited loan requests from your region
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium">Priority Support</p>
                  <p className="text-sm text-gray-600">
                    Get priority support for your lending activities
                  </p>
                </div>
              </div>
            </div>
            <Link href="/lender/subscribe">
              <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700">
                Upgrade to Premium - $22/month
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter loan requests
  const filteredRequests = loanRequests.filter((request) => {
    const matchesSearch = 
      request.borrower?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCountry = 
      filterCountry === "all" || 
      request.country?.code === filterCountry

    const matchesAmount = 
      filterAmount === "all" ||
      (filterAmount === "small" && request.amount <= 1000) ||
      (filterAmount === "medium" && request.amount > 1000 && request.amount <= 5000) ||
      (filterAmount === "large" && request.amount > 5000)

    const matchesPurpose = 
      filterPurpose === "all" || 
      request.purpose === filterPurpose

    return matchesSearch && matchesCountry && matchesAmount && matchesPurpose
  })

  // Get unique countries from requests
  const countries = Array.from(new Set(loanRequests.map(r => r.country?.code))).filter(Boolean)
  const purposes = Array.from(new Set(loanRequests.map(r => r.purpose))).filter(Boolean)

  const getCreditScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">No Score</Badge>
    if (score >= 750) return <Badge className="bg-green-100 text-green-800">Excellent ({score})</Badge>
    if (score >= 650) return <Badge className="bg-blue-100 text-blue-800">Good ({score})</Badge>
    if (score >= 550) return <Badge className="bg-yellow-100 text-yellow-800">Fair ({score})</Badge>
    return <Badge variant="destructive">Poor ({score})</Badge>
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loan Marketplace</h1>
        <p className="mt-2 text-gray-600">
          Browse verified loan requests from borrowers in your region
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanRequests.length}</div>
            <p className="text-xs text-muted-foreground">Available now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loanRequests.reduce((sum, r) => sum + r.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Combined value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Request</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loanRequests.reduce((sum, r) => sum + r.amount, 0) / (loanRequests.length || 1))}
            </div>
            <p className="text-xs text-muted-foreground">Per borrower</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries.length}</div>
            <p className="text-xs text-muted-foreground">Active regions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Browse Loan Requests</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search borrower or purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAmount} onValueChange={setFilterAmount}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="small">Under $1,000</SelectItem>
                  <SelectItem value="medium">$1,000 - $5,000</SelectItem>
                  <SelectItem value="large">Over $5,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 font-medium">
                          {request.borrower?.full_name?.charAt(0) || "B"}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-1">
                            {request.borrower?.full_name || "Anonymous"}
                            {request.borrower?.verified && (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.country?.name}
                          </p>
                        </div>
                      </div>
                      {request.country?.flag_emoji && (
                        <span className="text-2xl">{request.country.flag_emoji}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(request.amount)}</p>
                        <p className="text-sm text-gray-500">{request.country?.currency_code}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Purpose:</span>
                          <Badge variant="outline">{request.purpose}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">{request.duration_months} months</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Interest:</span>
                          <span className="font-medium">{request.interest_rate}% p.a.</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Credit Score:</span>
                          {getCreditScoreBadge(request.borrower?.credit_score)}
                        </div>
                      </div>

                      <div className="pt-3 space-y-2">
                        <Button 
                          className="w-full"
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowDetailsDialog(true)
                          }}
                        >
                          View Details
                        </Button>
                        <Link href={`/lender/requests/${request.id}`}>
                          <Button variant="outline" className="w-full">
                            Make Offer
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No loan requests found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Request Details</DialogTitle>
            <DialogDescription>
              Review borrower information and loan requirements
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-medium">
                  {selectedRequest.borrower?.full_name?.charAt(0) || "B"}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-lg flex items-center gap-2">
                    {selectedRequest.borrower?.full_name}
                    {selectedRequest.borrower?.verified && (
                      <Badge className="bg-green-100 text-green-800">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </p>
                  <p className="text-gray-500">{selectedRequest.borrower?.email}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {selectedRequest.country?.name} {selectedRequest.country?.flag_emoji}
                  </p>
                </div>
                {getCreditScoreBadge(selectedRequest.borrower?.credit_score)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Loan Amount</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(selectedRequest.amount)} {selectedRequest.country?.currency_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">{selectedRequest.duration_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interest Rate</p>
                    <p className="font-medium">{selectedRequest.interest_rate}% per annum</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Purpose</p>
                    <p className="font-medium">{selectedRequest.purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Requested Date</p>
                    <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monthly Payment</p>
                    <p className="font-medium">
                      {formatCurrency((selectedRequest.amount * (1 + selectedRequest.interest_rate/100)) / selectedRequest.duration_months)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-700">{selectedRequest.description}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Always verify borrower documents and conduct due diligence before making lending decisions.
                  This platform provides reputation data to supplement your verification process.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedRequest && (
              <Link href={`/lender/requests/${selectedRequest.id}`}>
                <Button>Make Offer</Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}