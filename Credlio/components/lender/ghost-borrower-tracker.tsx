"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Ghost, 
  Plus, 
  User, 
  Phone, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  Mail
} from "lucide-react"
import { toast } from "sonner"
import { COUNTRIES } from "@/lib/constants/countries"
import { format, formatDistanceToNow, isPast, addDays } from "date-fns"

interface GhostBorrower {
  id: string
  full_name: string
  phone_number?: string
  email?: string
  country_code: string
  created_at: string
  linked_profile_id?: string
  linked_at?: string
  active_loans?: GhostLoan[]
  total_borrowed?: number
  total_defaulted?: number
}

interface GhostLoan {
  id: string
  ghost_borrower_id: string
  loan_amount: number
  currency: string
  interest_rate: number
  total_amount: number
  loan_date: string
  due_date: string
  status: 'active' | 'paid' | 'overdue' | 'defaulted'
  amount_paid: number
  last_payment_date?: string
  is_defaulted: boolean
  days_overdue: number
  borrower?: GhostBorrower
}

interface GhostBorrowerTrackerProps {
  lenderId: string
  countryCode: string
}

export function GhostBorrowerTracker({ lenderId, countryCode }: GhostBorrowerTrackerProps) {
  const [ghostBorrowers, setGhostBorrowers] = useState<GhostBorrower[]>([])
  const [ghostLoans, setGhostLoans] = useState<GhostLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddBorrowerDialog, setShowAddBorrowerDialog] = useState(false)
  const [showAddLoanDialog, setShowAddLoanDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedBorrower, setSelectedBorrower] = useState<GhostBorrower | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<GhostLoan | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [borrowerForm, setBorrowerForm] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    country_code: countryCode,
  })

  const [loanForm, setLoanForm] = useState({
    ghost_borrower_id: "",
    loan_amount: "",
    interest_rate: "0",
    loan_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: "",
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
  }, [lenderId])

  async function fetchData() {
    try {
      // Fetch ghost borrowers
      const { data: borrowers, error: borrowersError } = await supabase
        .from("ghost_borrowers")
        .select("*")
        .eq("lender_id", lenderId)
        .order("created_at", { ascending: false })

      if (borrowersError) throw borrowersError

      // Fetch ghost loans
      const { data: loans, error: loansError } = await supabase
        .from("ghost_loans")
        .select(`
          *,
          borrower:ghost_borrowers(*)
        `)
        .eq("lender_id", lenderId)
        .order("created_at", { ascending: false })

      if (loansError) throw loansError

      // Process borrowers with loan summaries
      const processedBorrowers = borrowers?.map(borrower => {
        const borrowerLoans = loans?.filter(l => l.ghost_borrower_id === borrower.id) || []
        const activeLoans = borrowerLoans.filter(l => ['active', 'overdue'].includes(l.status))
        const totalBorrowed = borrowerLoans.reduce((sum, l) => sum + l.loan_amount, 0)
        const totalDefaulted = borrowerLoans
          .filter(l => l.is_defaulted)
          .reduce((sum, l) => sum + (l.total_amount - l.amount_paid), 0)

        return {
          ...borrower,
          active_loans: activeLoans,
          total_borrowed: totalBorrowed,
          total_defaulted: totalDefaulted,
        }
      }) || []

      setGhostBorrowers(processedBorrowers)
      setGhostLoans(loans || [])

      // Check for overdue loans
      await checkOverdueLoans()
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch ghost borrowers")
    } finally {
      setLoading(false)
    }
  }

  async function checkOverdueLoans() {
    const { error } = await supabase.rpc('check_overdue_ghost_loans')
    if (error) {
      console.error("Error checking overdue loans:", error)
    }
  }

  async function handleAddBorrower() {
    if (!borrowerForm.full_name) {
      toast.error("Please enter the borrower's name")
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("ghost_borrowers")
        .insert({
          lender_id: lenderId,
          full_name: borrowerForm.full_name.trim(),
          phone_number: borrowerForm.phone_number.trim() || null,
          email: borrowerForm.email.trim() || null,
          country_code: borrowerForm.country_code,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error("This borrower already exists")
        } else {
          throw error
        }
      } else {
        toast.success("Ghost borrower added successfully")
        await fetchData()
        setShowAddBorrowerDialog(false)
        resetBorrowerForm()
      }
    } catch (error) {
      console.error("Error adding borrower:", error)
      toast.error("Failed to add ghost borrower")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddLoan() {
    const amount = parseFloat(loanForm.loan_amount)
    const rate = parseFloat(loanForm.interest_rate)
    
    if (!loanForm.ghost_borrower_id || !amount || amount <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const totalAmount = amount + (amount * rate / 100)
      
      const { error } = await supabase
        .from("ghost_loans")
        .insert({
          ghost_borrower_id: loanForm.ghost_borrower_id,
          lender_id: lenderId,
          loan_amount: amount,
          interest_rate: rate,
          total_amount: totalAmount,
          loan_date: loanForm.loan_date,
          due_date: loanForm.due_date,
        })

      if (error) throw error

      toast.success("Loan added successfully")
      await fetchData()
      setShowAddLoanDialog(false)
      resetLoanForm()
    } catch (error) {
      console.error("Error adding loan:", error)
      toast.error("Failed to add loan")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecordPayment() {
    if (!selectedLoan || !paymentForm.amount) {
      toast.error("Please enter payment amount")
      return
    }

    const amount = parseFloat(paymentForm.amount)
    if (amount <= 0) {
      toast.error("Payment amount must be greater than 0")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("ghost_loan_payments")
        .insert({
          ghost_loan_id: selectedLoan.id,
          amount: amount,
          payment_date: paymentForm.payment_date,
          recorded_by: lenderId,
          notes: paymentForm.notes.trim() || null,
        })

      if (error) throw error

      toast.success("Payment recorded successfully")
      await fetchData()
      setShowPaymentDialog(false)
      resetPaymentForm()
    } catch (error) {
      console.error("Error recording payment:", error)
      toast.error("Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  function resetBorrowerForm() {
    setBorrowerForm({
      full_name: "",
      phone_number: "",
      email: "",
      country_code: countryCode,
    })
  }

  function resetLoanForm() {
    setLoanForm({
      ghost_borrower_id: "",
      loan_amount: "",
      interest_rate: "0",
      loan_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    })
  }

  function resetPaymentForm() {
    setPaymentForm({
      amount: "",
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      notes: "",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string, daysOverdue: number = 0) => {
    const config = {
      active: { label: "Active", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
      paid: { label: "Paid", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
      overdue: { label: `${daysOverdue}d Overdue`, color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
      defaulted: { label: "Defaulted", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
    }
    
    const { label, color, icon } = config[status as keyof typeof config] || config.active
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    )
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
                <Ghost className="h-5 w-5" />
                Ghost Borrower Tracker
              </CardTitle>
              <CardDescription>
                Track offline borrowers who don't have Credlio profiles
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddBorrowerDialog(true)} size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add Borrower
              </Button>
              <Button onClick={() => setShowAddLoanDialog(true)} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Loan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{ghostBorrowers.length}</div>
                <p className="text-xs text-muted-foreground">Ghost Borrowers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {ghostLoans.filter(l => ['active', 'overdue'].includes(l.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">Active Loans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {ghostLoans.filter(l => l.is_defaulted).length}
                </div>
                <p className="text-xs text-muted-foreground">Defaulted</p>
              </CardContent>
            </Card>
          </div>

          {/* Ghost Borrowers List */}
          {ghostBorrowers.length === 0 ? (
            <Alert>
              <AlertDescription>
                No ghost borrowers added yet. Click "Add Borrower" to start tracking offline borrowers.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {ghostBorrowers.map((borrower) => (
                <Card key={borrower.id} className={borrower.total_defaulted && borrower.total_defaulted > 0 ? "border-red-200" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <Ghost className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{borrower.full_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {borrower.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {borrower.phone_number}
                              </span>
                            )}
                            {borrower.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {borrower.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {borrower.linked_profile_id && (
                        <Badge variant="secondary">
                          <User className="mr-1 h-3 w-3" />
                          Linked Profile
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Borrowed</p>
                        <p className="font-medium">{formatCurrency(borrower.total_borrowed || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Active Loans</p>
                        <p className="font-medium">{borrower.active_loans?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Defaulted</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(borrower.total_defaulted || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Active Loans for this borrower */}
                    {borrower.active_loans && borrower.active_loans.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Active Loans:</p>
                        {borrower.active_loans.map((loan) => {
                          const progress = (loan.amount_paid / loan.total_amount) * 100
                          return (
                            <div key={loan.id} className="rounded border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">{formatCurrency(loan.total_amount)}</span>
                                  {getStatusBadge(loan.status, loan.days_overdue)}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLoan(loan)
                                    setShowPaymentDialog(true)
                                  }}
                                >
                                  <CreditCard className="mr-1 h-3 w-3" />
                                  Record Payment
                                </Button>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Progress: {progress.toFixed(1)}%</span>
                                  <span>Due: {format(new Date(loan.due_date), 'MMM d, yyyy')}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Alert>
            <Ghost className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Ghost borrowers who default are automatically marked as risky and visible to other lenders in {COUNTRIES[countryCode as keyof typeof COUNTRIES]?.name}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Add Borrower Dialog */}
      <Dialog open={showAddBorrowerDialog} onOpenChange={setShowAddBorrowerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ghost Borrower</DialogTitle>
            <DialogDescription>
              Track a borrower who doesn't have a Credlio profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="Enter borrower's name"
                value={borrowerForm.full_name}
                onChange={(e) => setBorrowerForm({ ...borrowerForm, full_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                placeholder="Enter phone number"
                value={borrowerForm.phone_number}
                onChange={(e) => setBorrowerForm({ ...borrowerForm, phone_number: e.target.value })}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={borrowerForm.email}
                onChange={(e) => setBorrowerForm({ ...borrowerForm, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Country</Label>
              <Select
                value={borrowerForm.country_code}
                onValueChange={(value) => setBorrowerForm({ ...borrowerForm, country_code: value })}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBorrowerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBorrower}
              disabled={!borrowerForm.full_name || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Borrower"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Loan Dialog */}
      <Dialog open={showAddLoanDialog} onOpenChange={setShowAddLoanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ghost Loan</DialogTitle>
            <DialogDescription>
              Record a loan given to a ghost borrower
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Borrower *</Label>
              <Select
                value={loanForm.ghost_borrower_id}
                onValueChange={(value) => setLoanForm({ ...loanForm, ghost_borrower_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a ghost borrower" />
                </SelectTrigger>
                <SelectContent>
                  {ghostBorrowers.map((borrower) => (
                    <SelectItem key={borrower.id} value={borrower.id}>
                      {borrower.full_name} {borrower.phone_number && `(${borrower.phone_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Loan Amount *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={loanForm.loan_amount}
                onChange={(e) => setLoanForm({ ...loanForm, loan_amount: e.target.value })}
              />
            </div>

            <div>
              <Label>Interest Rate (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loan Date</Label>
                <Input
                  type="date"
                  value={loanForm.loan_date}
                  onChange={(e) => setLoanForm({ ...loanForm, loan_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={loanForm.due_date}
                  onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                />
              </div>
            </div>

            {loanForm.loan_amount && loanForm.interest_rate && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Total to repay: {formatCurrency(
                    parseFloat(loanForm.loan_amount) + 
                    (parseFloat(loanForm.loan_amount) * parseFloat(loanForm.interest_rate) / 100)
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLoanDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLoan}
              disabled={!loanForm.ghost_borrower_id || !loanForm.loan_amount || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Loan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this loan
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Loan Amount: {formatCurrency(selectedLoan.total_amount)}</p>
                    <p>Amount Paid: {formatCurrency(selectedLoan.amount_paid)}</p>
                    <p className="font-medium">
                      Remaining: {formatCurrency(selectedLoan.total_amount - selectedLoan.amount_paid)}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div>
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Add any notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentForm.amount || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}