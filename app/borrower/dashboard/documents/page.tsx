import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye,
  Shield
} from "lucide-react"

export default async function DocumentsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, countries(name, code)")
    .eq("auth_user_id", user.id)
    .single()

  if (profile?.role !== "borrower") {
    redirect("/")
  }

  const requiredDocuments = [
    { 
      type: "national_id", 
      name: "National ID", 
      description: "Government-issued identification",
      status: profile?.national_id ? "verified" : "missing"
    },
    { 
      type: "proof_of_income", 
      name: "Proof of Income", 
      description: "Bank statements or salary slips",
      status: "missing"
    },
    { 
      type: "address_proof", 
      name: "Proof of Address", 
      description: "Utility bill or rental agreement",
      status: profile?.address ? "pending" : "missing"
    },
    { 
      type: "bank_statement", 
      name: "Bank Statement", 
      description: "Last 3 months bank statements",
      status: "missing"
    }
  ]

  const verifiedCount = requiredDocuments.filter(d => d.status === "verified").length
  const isFullyVerified = verifiedCount === requiredDocuments.length

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage your verification documents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFullyVerified ? "Verified" : "Pending"}
            </div>
            <p className="text-xs text-muted-foreground">
              {verifiedCount}/{requiredDocuments.length} documents verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Country</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.countries?.name}</div>
            <p className="text-xs text-muted-foreground">
              Document requirements vary by country
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            {profile?.is_verified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.is_verified ? "Verified" : "Unverified"}
            </div>
            <p className="text-xs text-muted-foreground">
              Complete all documents for verification
            </p>
          </CardContent>
        </Card>
      </div>

      {!isFullyVerified && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Complete document verification to access better loan offers and build trust with lenders.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
          <CardDescription>
            Upload these documents to verify your identity and eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requiredDocuments.map((doc) => (
              <div key={doc.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    doc.status === "verified" ? "bg-green-100" :
                    doc.status === "pending" ? "bg-yellow-100" : "bg-gray-100"
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      doc.status === "verified" ? "text-green-600" :
                      doc.status === "pending" ? "text-yellow-600" : "text-gray-600"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    doc.status === "verified" ? "default" :
                    doc.status === "pending" ? "secondary" : "outline"
                  }>
                    {doc.status === "verified" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {doc.status === "pending" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {doc.status}
                  </Badge>
                  {doc.status === "missing" ? (
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {doc.status === "verified" && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Clear and readable</p>
              <p className="text-sm text-muted-foreground">
                Ensure all text is clearly visible and not blurred
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Complete documents</p>
              <p className="text-sm text-muted-foreground">
                Upload all pages of multi-page documents
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Valid and current</p>
              <p className="text-sm text-muted-foreground">
                Documents should not be expired or outdated
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">File format</p>
              <p className="text-sm text-muted-foreground">
                PDF, JPG, or PNG files under 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}