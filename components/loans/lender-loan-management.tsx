"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loanOfferSchema, type LoanOfferInput } from "@/lib/validations/loan"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, Eye, CheckCircle, XCircle } from "lucide-react"

interface LoanApplication {
  id: string
  borrower_id: string
  loan_amount: number
  loan_purpose: string
  repayment_period: number
  monthly_income: number
  employment_status: string
  status: string
  created_at: string
  profiles: {
    full_name: string
    email: string
    country_id: string
  }
}

export function LenderLoanManagement() {
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null)
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  
  const supabase = createClientComponentClient()
  const { error, isLoading, execute } = useErrorHandler()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<LoanOfferInput>({
    resolver: zodResolver(loanOfferSchema),
  })

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select(`
          *,
          profiles!borrower_id (
            full_name,
            email,
            country_id
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err) {
      console.error("Error fetching applications:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleMakeOffer = (application: LoanApplication) => {
    setSelectedApplication(application)
    // Pre-fill offer amount with requested amount
    setValue("offeredAmount", application.loan_amount)
    setValue("repaymentPeriod", application.repayment_period)
    setOfferDialogOpen(true)
  }

  const onSubmitOffer = async (data: LoanOfferInput) => {
    if (!selectedApplication) return

    const result = await execute(async () => {
      // Get current user (lender)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error("Not authenticated")

      // Get lender profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (profileError) throw profileError

      // Create loan offer
      const { data: offer, error: offerError } = await supabase
        .from("loan_offers")
        .insert({
          loan_application_id: selectedApplication.id,
          lender_id: profile.id,
          offered_amount: data.offeredAmount,
          interest_rate: data.interestRate,
          repayment_period: data.repaymentPeriod,
          repayment_schedule: data.repaymentSchedule,
          conditions: data.conditions,
          status: "pending",
        })
        .select()
        .single()

      if (offerError) throw offerError

      // Update application status
      await supabase
        .from("loan_applications")
        .update({ status: "under_review" })
        .eq("id", selectedApplication.id)

      return offer
    })

    if (result) {
      setOfferDialogOpen(false)
      reset()
      fetchApplications()
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      under_review: "default",
      approved: "outline",
      rejected: "destructive",
      funded: "default",
      active: "default",
      completed: "outline",
      defaulted: "destructive",
    }

    return <Badge variant={variants[status] || "default"}>{status.replace("_", " ")}</Badge>
  }

  const calculateMonthlyPayment = (principal: number, rate: number, months: number) => {
    const monthlyRate = rate / 100 / 12
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    return payment
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
          <CardDescription>Review and make offers on loan applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="my-offers">My Offers</TabsTrigger>
              <TabsTrigger value="active">Active Loans</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Borrower</p>
                        <p className="font-medium">{application.profiles.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium">{formatCurrency(application.loan_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Period</p>
                        <p className="font-medium">{application.repayment_period} months</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        {getStatusBadge(application.status)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Purpose</p>
                        <p className="text-sm">{application.loan_purpose}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Monthly Income</Label>
                                  <p className="text-sm">{formatCurrency(application.monthly_income)}</p>
                                </div>
                                <div>
                                  <Label>Employment Status</Label>
                                  <p className="text-sm">{application.employment_status}</p>
                                </div>
                              </div>
                              <div>
                                <Label>Debt-to-Income Ratio</Label>
                                <p className="text-sm">
                                  {((application.loan_amount / application.repayment_period / application.monthly_income) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {application.status === "pending" && (
                          <Button size="sm" onClick={() => handleMakeOffer(application)}>
                            Make Offer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Loan Offer</DialogTitle>
            <DialogDescription>
              Create an offer for this loan application
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitOffer)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="offeredAmount">Offer Amount ($)</Label>
                <Input
                  id="offeredAmount"
                  type="number"
                  {...register("offeredAmount", { valueAsNumber: true })}
                />
                {errors.offeredAmount && (
                  <p className="text-sm text-red-500">{errors.offeredAmount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  {...register("interestRate", { valueAsNumber: true })}
                />
                {errors.interestRate && (
                  <p className="text-sm text-red-500">{errors.interestRate.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repaymentPeriod">Repayment Period (months)</Label>
                <Input
                  id="repaymentPeriod"
                  type="number"
                  {...register("repaymentPeriod", { valueAsNumber: true })}
                />
                {errors.repaymentPeriod && (
                  <p className="text-sm text-red-500">{errors.repaymentPeriod.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="repaymentSchedule">Repayment Schedule</Label>
                <Select 
                  onValueChange={(value) => setValue("repaymentSchedule", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.repaymentSchedule && (
                  <p className="text-sm text-red-500">{errors.repaymentSchedule.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Additional Conditions (Optional)</Label>
              <Textarea
                id="conditions"
                {...register("conditions")}
                placeholder="Any special terms or conditions..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Offer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}