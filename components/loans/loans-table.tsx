"use client"

import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MoreHorizontal, Search, Filter, Download } from "lucide-react"

interface Loan {
  id: string
  borrower_name?: string
  lender_name?: string
  amount: number
  interest_rate: number
  status: string
  created_at: string
  repayment_period: number
  purpose: string
}

interface LoansTableProps {
  loans: Loan[]
  loading?: boolean
  userRole: "borrower" | "lender"
  onViewDetails?: (loan: Loan) => void
  onMakeOffer?: (loan: Loan) => void
  onAcceptOffer?: (loan: Loan) => void
}

export function LoansTable({
  loans,
  loading,
  userRole,
  onViewDetails,
  onMakeOffer,
  onAcceptOffer,
}: LoansTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = 
      loan.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.borrower_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loan.lender_name?.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || loan.status === statusFilter

    return matchesSearch && matchesStatus
  })

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

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const exportToCSV = () => {
    const headers = userRole === "borrower" 
      ? ["Date", "Amount", "Interest Rate", "Period", "Status", "Purpose"]
      : ["Date", "Borrower", "Amount", "Interest Rate", "Period", "Status", "Purpose"]

    const rows = filteredLoans.map((loan) => {
      const baseRow = [
        formatDate(loan.created_at),
        formatCurrency(loan.amount),
        `${loan.interest_rate}%`,
        `${loan.repayment_period} months`,
        loan.status,
        loan.purpose,
      ]

      if (userRole === "lender") {
        baseRow.splice(1, 0, loan.borrower_name || "N/A")
      }

      return baseRow
    })

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `loans-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search loans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {userRole === "lender" && <TableHead>Borrower</TableHead>}
              {userRole === "borrower" && <TableHead>Lender</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No loans found
                </TableCell>
              </TableRow>
            ) : (
              filteredLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{formatDate(loan.created_at)}</TableCell>
                  {userRole === "lender" && (
                    <TableCell>{loan.borrower_name || "N/A"}</TableCell>
                  )}
                  {userRole === "borrower" && (
                    <TableCell>{loan.lender_name || "N/A"}</TableCell>
                  )}
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{loan.interest_rate}%</TableCell>
                  <TableCell>{loan.repayment_period} months</TableCell>
                  <TableCell>{getStatusBadge(loan.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDetails?.(loan)}>
                          View Details
                        </DropdownMenuItem>
                        {userRole === "lender" && loan.status === "pending" && (
                          <DropdownMenuItem onClick={() => onMakeOffer?.(loan)}>
                            Make Offer
                          </DropdownMenuItem>
                        )}
                        {userRole === "borrower" && loan.status === "under_review" && (
                          <DropdownMenuItem onClick={() => onAcceptOffer?.(loan)}>
                            View Offers
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}