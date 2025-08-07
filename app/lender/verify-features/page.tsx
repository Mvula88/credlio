"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, FileText, Shield, AlertCircle, Users, Lock, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function VerifyFeaturesPage() {
  const features = [
    {
      category: "Document Verification System",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      status: "active",
      items: [
        {
          name: "Document Upload & Verification",
          path: "/lender/new-verification",
          description: "Upload and verify borrower documents including ID, proof of income, bank statements",
          status: "ready"
        },
        {
          name: "WhatsApp Call Verification",
          path: "/lender/approve/[loanId]",
          description: "Record and verify WhatsApp calls with borrowers before loan approval",
          status: "ready"
        },
        {
          name: "Identity Verification API",
          path: "/api/auth/check-identity",
          description: "Automated identity verification using ID/passport numbers",
          status: "ready"
        },
        {
          name: "Document Hash Verification",
          path: "Built-in Feature",
          description: "SHA-256 hashing to ensure document integrity and prevent tampering",
          status: "ready"
        }
      ]
    },
    {
      category: "Blacklist & Risk Management",
      icon: <Shield className="h-6 w-6 text-red-600" />,
      status: "active",
      items: [
        {
          name: "Blacklist Management Dashboard",
          path: "/lender/dashboard/risk/blacklist",
          description: "View and manage blacklisted borrowers with detailed risk information",
          status: "ready"
        },
        {
          name: "Auto-Blacklist After 7 Days",
          path: "Automatic Process",
          description: "Automatically blacklist borrowers who default for more than 7 days",
          status: "ready",
          highlight: true
        },
        {
          name: "Report Defaulter System",
          path: "/lender/report-defaulter",
          description: "Report defaulters with evidence and automatically update risk scores",
          status: "ready"
        },
        {
          name: "Risk Score Tracking",
          path: "/api/borrowers/risk-check",
          description: "Real-time risk score calculation based on payment history and reports",
          status: "ready"
        },
        {
          name: "Deregistration Requests",
          path: "/lender/deregistration-requests",
          description: "Request to permanently deregister bad borrowers from the platform",
          status: "ready"
        },
        {
          name: "Cross-Lender Risk Sharing",
          path: "Built-in Feature",
          description: "Share risk information across all lenders on the platform",
          status: "ready"
        }
      ]
    },
    {
      category: "Loan Agreement System",
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      status: "active",
      items: [
        {
          name: "PDF Agreement Generation",
          path: "/lender/loans/[loanId]/generate-agreement",
          description: "Generate professional PDF loan agreements with custom terms",
          status: "ready"
        },
        {
          name: "Digital Signature System",
          path: "/borrower/agreements/[id]/sign",
          description: "Borrowers can digitally sign agreements with legal validity",
          status: "ready"
        },
        {
          name: "Strong Legal Warnings",
          path: "Built into Agreements",
          description: "Automatic inclusion of blacklisting warnings and legal consequences",
          status: "ready",
          highlight: true
        },
        {
          name: "Agreement Audit Trail",
          path: "Automatic Logging",
          description: "Complete audit trail of all agreement actions for legal compliance",
          status: "ready"
        },
        {
          name: "Customizable Terms",
          path: "Agreement Generation",
          description: "Set custom interest rates, penalties, and repayment schedules",
          status: "ready"
        }
      ]
    },
    {
      category: "Loan Approval System",
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      status: "active",
      items: [
        {
          name: "Comprehensive Approval Checklist",
          path: "/lender/approve/[loanId]",
          description: "Multi-step verification checklist before loan approval",
          status: "ready"
        },
        {
          name: "Document Verification Requirements",
          path: "/lender/approve/[loanId]",
          description: "Mandatory document checks before approval can proceed",
          status: "ready"
        },
        {
          name: "Risk Assessment Calculator",
          path: "/lender/dashboard/risk/calculator",
          description: "Calculate borrower risk based on multiple factors",
          status: "ready"
        },
        {
          name: "WhatsApp Call Recording",
          path: "In Approval Process",
          description: "Record verification calls for compliance and evidence",
          status: "ready"
        }
      ]
    },
    {
      category: "Security & Tracking",
      icon: <Lock className="h-6 w-6 text-indigo-600" />,
      status: "active",
      items: [
        {
          name: "Device Fingerprinting",
          path: "Automatic on Login",
          description: "Track and verify user devices for enhanced security",
          status: "ready"
        },
        {
          name: "Off-Platform Activity Tracking",
          path: "Background Process",
          description: "Monitor borrower activities outside the platform",
          status: "ready"
        },
        {
          name: "Location Verification",
          path: "Middleware Check",
          description: "Verify user location matches their registered country",
          status: "ready"
        },
        {
          name: "Session Security",
          path: "Built-in Feature",
          description: "Secure session management with automatic timeout",
          status: "ready"
        }
      ]
    },
    {
      category: "Communication & Invitations",
      icon: <Users className="h-6 w-6 text-teal-600" />,
      status: "active",
      items: [
        {
          name: "Borrower Invitation System",
          path: "/lender/dashboard/borrowers/invite",
          description: "Invite trusted borrowers to join the platform",
          status: "ready"
        },
        {
          name: "Email Notifications",
          path: "Automatic",
          description: "Automated emails for loan updates, payments, and alerts",
          status: "ready"
        },
        {
          name: "In-App Messaging",
          path: "/messages",
          description: "Direct messaging between lenders and borrowers",
          status: "ready"
        }
      ]
    }
  ]

  const totalFeatures = features.reduce((acc, cat) => acc + cat.items.length, 0)
  const readyFeatures = features.reduce((acc, cat) => 
    acc + cat.items.filter(item => item.status === "ready").length, 0
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Complete Feature Overview</h1>
          <p className="text-muted-foreground mt-2">
            All functionality implemented in your Credlio platform
          </p>
        </div>
        <Link href="/lender/dashboard">
          <Button size="lg">Go to Dashboard</Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle>✅ All Features Active</CardTitle>
          <CardDescription>Your platform is fully functional with all features working</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{readyFeatures}</p>
              <p className="text-sm text-gray-600">Features Ready</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{features.length}</p>
              <p className="text-sm text-gray-600">Feature Categories</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">100%</p>
              <p className="text-sm text-gray-600">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Access to Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/lender/new-verification">
              <Button className="w-full" variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Verify Documents
              </Button>
            </Link>
            <Link href="/lender/report-defaulter">
              <Button className="w-full" variant="destructive">
                <AlertCircle className="mr-2 h-4 w-4" />
                Report Defaulter
              </Button>
            </Link>
            <Link href="/lender/dashboard/risk/blacklist">
              <Button className="w-full" variant="outline">
                <XCircle className="mr-2 h-4 w-4" />
                View Blacklist
              </Button>
            </Link>
            <Link href="/lender/requests">
              <Button className="w-full" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Loan Requests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      {features.map((category, idx) => (
        <Card key={idx} className="overflow-hidden">
          <CardHeader className="bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {category.icon}
                <CardTitle>{category.category}</CardTitle>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {category.items.filter(i => i.status === "ready").length}/{category.items.length} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4">
              {category.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx} 
                  className={`flex items-start justify-between p-4 rounded-lg border ${
                    item.highlight ? 'border-amber-300 bg-amber-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.highlight && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">KEY FEATURE</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    {item.path.startsWith('/') ? (
                      <Link href={item.path.includes('[') ? '#' : item.path}>
                        <Button size="sm" variant="ghost">View →</Button>
                      </Link>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{item.path}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Important Features Highlight */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            Key Features Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-semibold">Auto-Blacklist After 7 Days</p>
                <p className="text-sm text-gray-600">
                  Borrowers are automatically blacklisted if they default for more than 7 days. This protects all lenders on the platform.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold">Strong Legal Warnings in Agreements</p>
                <p className="text-sm text-gray-600">
                  All loan agreements include automatic warnings about blacklisting, credit damage, and legal consequences for defaulting.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold">Cross-Lender Risk Sharing</p>
                <p className="text-sm text-gray-600">
                  When one lender reports a defaulter, all lenders can see the risk information, protecting the entire community.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold">WhatsApp Call Verification</p>
                <p className="text-sm text-gray-600">
                  Record and verify borrower identity through WhatsApp calls before approving loans.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}