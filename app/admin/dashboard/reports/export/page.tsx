export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Download, Calendar, Users, DollarSign, TrendingUp } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"

export default async function ExportReportsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile?.role?.includes("admin")) {
    redirect("/")
  }

  const reportTypes = [
    {
      id: "users",
      name: "User Report",
      description: "Export user data including profiles and roles",
      icon: Users,
      fields: ["Full Name", "Email", "Role", "Country", "Verification Status", "Join Date"]
    },
    {
      id: "loans",
      name: "Loans Report",
      description: "Export loan data including requests and offers",
      icon: DollarSign,
      fields: ["Loan ID", "Borrower", "Lender", "Amount", "Status", "Interest Rate", "Duration"]
    },
    {
      id: "payments",
      name: "Payments Report",
      description: "Export payment transactions and history",
      icon: TrendingUp,
      fields: ["Payment ID", "Amount", "Status", "Due Date", "Payment Date", "Method"]
    },
    {
      id: "audit",
      name: "Audit Log Report",
      description: "Export system audit logs for compliance",
      icon: FileText,
      fields: ["Action", "User", "Resource", "Timestamp", "IP Address", "Result"]
    }
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Reports</h1>
        <p className="text-muted-foreground">
          Generate and download system reports for analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Select report type and configure export options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select name="reportType">
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select a report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <span>to</span>
                <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select name="format" defaultValue="csv">
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel (XLSX)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {report.name}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Available Fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {report.fields.map((field) => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    Quick Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}