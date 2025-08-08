"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseClient } from "@/lib/supabase/singleton-client"
import { AlertCircle, CheckCircle, Search, Eye, Filter, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Database } from "@/lib/types/database"

export function AdminBlacklistSection() {
  const [blacklistEntries, setBlacklistEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all")
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchBlacklistEntries() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("blacklist")
          .select(
            `
            *,
            profiles:reported_user_id(id, full_name, email, avatar_url),
            reporter:reporter_id(id, full_name, email, avatar_url)
          `
          )
          .order("created_at", { ascending: false })

        if (error) throw error
        setBlacklistEntries(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBlacklistEntries()
  }, [supabase])

  const filteredEntries = blacklistEntries.filter((entry) => {
    const matchesSearch =
      entry.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || entry.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleRemoveFromBlacklist = async (id: string) => {
    try {
      const { error } = await supabase.from("blacklist").update({ status: "resolved" }).eq("id", id)

      if (error) throw error

      // Update local state
      setBlacklistEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, status: "resolved" } : entry))
      )

      // If we're viewing the details of this entry, update it
      if (selectedEntry?.id === id) {
        setSelectedEntry({ ...selectedEntry, status: "resolved" })
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const viewDetails = (entry: any) => {
    setSelectedEntry(entry)
    setDetailsDialogOpen(true)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
          <div>
            <CardTitle>Blacklisted Borrowers</CardTitle>
            <CardDescription>Review and manage blacklisted users on the platform</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search blacklist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:w-[200px] lg:w-[300px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            </div>
          ) : filteredEntries.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead className="hidden md:table-cell">Reported By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={entry.profiles?.avatar_url || "/placeholder.svg"}
                              alt={entry.profiles?.full_name || "User"}
                            />
                            <AvatarFallback>
                              {entry.profiles?.full_name
                                ? getInitials(entry.profiles.full_name)
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {entry.profiles?.full_name || "Unknown"}
                            </div>
                            <div className="hidden text-xs text-gray-500 sm:block">
                              {entry.profiles?.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={entry.reporter?.avatar_url || "/placeholder.svg"}
                              alt={entry.reporter?.full_name || "Reporter"}
                            />
                            <AvatarFallback>
                              {entry.reporter?.full_name
                                ? getInitials(entry.reporter.full_name)
                                : "R"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{entry.reporter?.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={entry.reason}>
                        {entry.reason}
                      </TableCell>
                      <TableCell className="hidden text-sm text-gray-500 sm:table-cell">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.status === "active" ? "destructive" : "outline"}
                          className="capitalize"
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => viewDetails(entry)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {entry.status === "active" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveFromBlacklist(entry.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Remove from Blacklist
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border bg-gray-50 py-10 text-center">
              <p className="text-gray-500">No blacklisted borrowers found</p>
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Blacklist Details</DialogTitle>
            <DialogDescription>Detailed information about this blacklist entry</DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={selectedEntry.profiles?.avatar_url || "/placeholder.svg"}
                    alt={selectedEntry.profiles?.full_name || "User"}
                  />
                  <AvatarFallback>
                    {selectedEntry.profiles?.full_name
                      ? getInitials(selectedEntry.profiles.full_name)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedEntry.profiles?.full_name || "Unknown User"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedEntry.profiles?.email || "No email"}
                  </p>
                </div>
                <Badge
                  variant={selectedEntry.status === "active" ? "destructive" : "outline"}
                  className="ml-auto capitalize"
                >
                  {selectedEntry.status}
                </Badge>
              </div>

              <div className="rounded-md bg-gray-50 p-4">
                <h4 className="mb-2 font-medium">Reason for Blacklisting</h4>
                <p className="whitespace-pre-line text-gray-700">{selectedEntry.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Reported By</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={selectedEntry.reporter?.avatar_url || "/placeholder.svg"}
                        alt={selectedEntry.reporter?.full_name || "Reporter"}
                      />
                      <AvatarFallback>
                        {selectedEntry.reporter?.full_name
                          ? getInitials(selectedEntry.reporter.full_name)
                          : "R"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedEntry.reporter?.full_name || "Unknown"}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date Reported</h4>
                  <p>
                    {new Date(selectedEntry.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {selectedEntry.evidence_url && (
                <div>
                  <h4 className="mb-2 font-medium">Evidence</h4>
                  <a
                    href={selectedEntry.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    View attached evidence
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedEntry?.status === "active" && (
              <Button
                variant="outline"
                onClick={() => handleRemoveFromBlacklist(selectedEntry.id)}
                className="mr-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Remove from Blacklist
              </Button>
            )}
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Add this export alias at the end of the file
export const BlacklistSection = AdminBlacklistSection
