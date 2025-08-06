"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  MessageSquare,
  FileText,
  Clock,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ActiveLoansClientProps {
  loans: any[]
  stats: {
    totalActive: number
    totalAmount: number
    overdueCount: number
    averageInterestRate: number
  }
}

export function ActiveLoansClient({ loans, stats }: ActiveLoansClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter loans based on search and status
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = 
      loan.borrower?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      filterStatus === "all" || 
      loan.status === filterStatus

    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLoans = filteredLoans.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      case "defaulted":
        return <Badge variant="destructive">Defaulted</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const calculateRepaymentProgress = (loan: any) => {
    if (!loan.repayments || loan.repayments.length === 0) return 0
    const totalRepaid = loan.repayments.reduce((sum: number, payment: any) => 
      payment.status === "completed" ? sum + payment.amount : sum, 0
    )
    return Math.min((totalRepaid / loan.amount) * 100, 100)
  }

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Loans</h1>
        <p className="mt-2 text-gray-600">
          Manage and monitor your active lending portfolio
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Active loan contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Currently deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageInterestRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Average rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Loan Portfolio</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search borrower..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                    All Loans
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                    Active Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("overdue")}>
                    Overdue Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedLoans.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Repayment Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLoans.map((loan) => {
                    const progress = calculateRepaymentProgress(loan)
                    const daysRemaining = getDaysRemaining(loan.due_date)
                    
                    return (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 font-medium">
                              {loan.borrower?.full_name?.charAt(0) || "B"}
                            </div>
                            <div>
                              <p className="font-medium">{loan.borrower?.full_name || "Unknown"}</p>
                              <p className="text-sm text-gray-500">{loan.borrower?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(loan.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {loan.borrower?.country?.currency_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{loan.interest_rate}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{formatDate(loan.due_date)}</p>
                              <p className="text-xs text-gray-500">
                                {daysRemaining > 0 
                                  ? `${daysRemaining} days remaining`
                                  : `${Math.abs(daysRemaining)} days overdue`
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-gray-500">{progress.toFixed(0)}% repaid</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/lender/loans/${loan.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message Borrower
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                View Contract
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Report Issue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLoans.length)} of {filteredLoans.length} loans
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No active loans</h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "No loans match your search criteria"
                  : "You don't have any active loans yet"}
              </p>
              <Link href="/lender/dashboard/marketplace">
                <Button className="mt-4">Browse Marketplace</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}