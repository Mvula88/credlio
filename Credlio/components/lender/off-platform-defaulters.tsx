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
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  Loader2,
  Users
} from "lucide-react"
import { toast } from "sonner"
import { COUNTRIES } from "@/lib/constants/countries"

interface OffPlatformDefaulter {
  id: string
  full_name: string
  phone_number?: string
  country_code: string
  loan_type: string
  reason: string
  reported_by: string
  reported_at: string
  report_count?: number
  reporters?: string[]
}

interface OffPlatformDefaultersProps {
  lenderId: string
  countryCode: string
}

export function OffPlatformDefaulters({ lenderId, countryCode }: OffPlatformDefaultersProps) {
  const [defaulters, setDefaulters] = useState<OffPlatformDefaulter[]>([])
  const [filteredDefaulters, setFilteredDefaulters] = useState<OffPlatformDefaulter[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    country_code: countryCode,
    loan_type: "cash_loan",
    reason: "",
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDefaulters()
  }, [countryCode])

  useEffect(() => {
    const filtered = defaulters.filter(
      (defaulter) =>
        defaulter.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defaulter.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredDefaulters(filtered)
  }, [searchQuery, defaulters])

  async function fetchDefaulters() {
    try {
      // Fetch all defaulters reported in the same country
      const { data, error } = await supabase
        .from("off_platform_defaulters")
        .select(`
          id,
          full_name,
          phone_number,
          country_code,
          loan_type,
          reason,
          reported_by,
          reported_at
        `)
        .eq("country_code", countryCode)
        .order("reported_at", { ascending: false })

      if (error) throw error

      // Group by person to count unique reporters
      const groupedData = data?.reduce((acc: any, curr) => {
        const key = `${curr.full_name}_${curr.phone_number || 'no_phone'}`
        if (!acc[key]) {
          acc[key] = {
            ...curr,
            report_count: 1,
            reporters: [curr.reported_by]
          }
        } else {
          acc[key].report_count++
          if (!acc[key].reporters.includes(curr.reported_by)) {
            acc[key].reporters.push(curr.reported_by)
          }
          // Keep the most recent report's details
          if (new Date(curr.reported_at) > new Date(acc[key].reported_at)) {
            acc[key] = {
              ...curr,
              report_count: acc[key].report_count,
              reporters: acc[key].reporters
            }
          }
        }
        return acc
      }, {})

      const processedData = Object.values(groupedData || {})
      setDefaulters(processedData)
      setFilteredDefaulters(processedData)
    } catch (error) {
      console.error("Error fetching defaulters:", error)
      toast.error("Failed to fetch defaulters")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!formData.full_name || !formData.reason) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("off_platform_defaulters")
        .insert({
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim() || null,
          country_code: formData.country_code,
          loan_type: formData.loan_type,
          reason: formData.reason.trim(),
          reported_by: lenderId,
        })

      if (error) {
        if (error.code === '23505') {
          toast.error("You have already reported this person")
        } else {
          throw error
        }
      } else {
        toast.success("Defaulter reported successfully")
        await fetchDefaulters()
        setShowAddDialog(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error reporting defaulter:", error)
      toast.error("Failed to report defaulter")
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      full_name: "",
      phone_number: "",
      country_code: countryCode,
      loan_type: "cash_loan",
      reason: "",
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getLoanTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      cash_loan: { label: "Cash Loan", color: "bg-blue-100 text-blue-800" },
      business_loan: { label: "Business Loan", color: "bg-green-100 text-green-800" },
      personal_loan: { label: "Personal Loan", color: "bg-purple-100 text-purple-800" },
      other: { label: "Other", color: "bg-gray-100 text-gray-800" },
    }
    const config = typeMap[type] || typeMap.other
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
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Off-Platform Defaulters
              </CardTitle>
              <CardDescription>
                Report and view borrowers who defaulted outside Credlio
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Report Defaulter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Defaulter List */}
          {filteredDefaulters.length === 0 ? (
            <Alert>
              <AlertDescription>
                No off-platform defaulters reported in {COUNTRIES[countryCode as keyof typeof COUNTRIES]?.name || countryCode}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredDefaulters.map((defaulter) => (
                <div key={defaulter.id} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                          <User className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{defaulter.full_name}</p>
                          {defaulter.phone_number && (
                            <p className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {defaulter.phone_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {getLoanTypeBadge(defaulter.loan_type)}
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="mr-1 h-3 w-3" />
                          {COUNTRIES[defaulter.country_code as keyof typeof COUNTRIES]?.name || defaulter.country_code}
                        </Badge>
                        {defaulter.report_count && defaulter.report_count > 1 && (
                          <Badge variant="destructive" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            Defrauded {defaulter.report_count} lenders
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 rounded bg-white p-2">
                        <p className="text-sm font-medium text-gray-700">Reason:</p>
                        <p className="text-sm text-gray-600">{defaulter.reason}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">Reported on</p>
                      <p className="text-sm font-medium">{formatDate(defaulter.reported_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> These reports are visible to all lenders in {COUNTRIES[countryCode as keyof typeof COUNTRIES]?.name || countryCode}.
              Only report confirmed cases of fraud or default.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Add Defaulter Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Off-Platform Defaulter</DialogTitle>
            <DialogDescription>
              Report someone who defrauded you outside the Credlio platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Enter full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone Number (Optional)</Label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>

            <div>
              <Label>Country</Label>
              <Select
                value={formData.country_code}
                onValueChange={(value) => setFormData({ ...formData, country_code: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COUNTRIES).map(([code, country]) => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type of Loan</Label>
              <Select
                value={formData.loan_type}
                onValueChange={(value) => setFormData({ ...formData, loan_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_loan">Cash Loan</SelectItem>
                  <SelectItem value="business_loan">Business Loan</SelectItem>
                  <SelectItem value="personal_loan">Personal Loan</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason *</Label>
              <Textarea
                placeholder="Describe what happened..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.full_name || !formData.reason || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reporting...
                </>
              ) : (
                "Report Defaulter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}