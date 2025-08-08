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
import {
  AlertCircle,
  Search,
  UserX,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Database } from "@/lib/types/database"

export function UsersSection() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [blacklistReason, setBlacklistReason] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "",
  })
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            *,
            user_profile_roles (
              user_roles (
                name
              )
            )
          `
          )
          .order("created_at", { ascending: false })

        if (error) throw error
        setUsers(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [supabase])

  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())

    // Role filter
    const userRole = getUserRole(user)
    const matchesRole = roleFilter === "all" || userRole.toLowerCase() === roleFilter.toLowerCase()

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "blacklisted" && user.is_blacklisted) ||
      (statusFilter === "active" && !user.is_blacklisted)

    return matchesSearch && matchesRole && matchesStatus
  })

  const handleBlacklistUser = async () => {
    if (!selectedUser || !blacklistReason.trim()) return

    try {
      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("You must be logged in to blacklist a user")

      // Add to blacklist
      const { error } = await supabase.from("blacklist").insert({
        reported_user_id: selectedUser.auth_user_id,
        reporter_id: session.user.id,
        reason: blacklistReason,
        status: "active",
      })

      if (error) throw error

      // Update user status in profiles table
      await supabase.from("profiles").update({ is_blacklisted: true }).eq("id", selectedUser.id)

      // Close dialog and reset
      setBlacklistDialogOpen(false)
      setBlacklistReason("")
      setSelectedUser(null)

      // Update user status locally
      setUsers((prev) =>
        prev.map((user) => (user.id === selectedUser.id ? { ...user, is_blacklisted: true } : user))
      )
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      // Delete user profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id)

      if (profileError) throw profileError

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.auth_user_id)

      if (authError) throw authError

      // Close dialog and reset
      setDeleteDialogOpen(false)
      setSelectedUser(null)

      // Update users list locally
      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
        })
        .eq("id", selectedUser.id)

      if (profileError) throw profileError

      // Update role if changed
      if (editForm.role !== getUserRole(selectedUser).toLowerCase()) {
        // This would require additional logic to update roles
        // For now, we'll just show a success message
      }

      // Close dialog and reset
      setEditDialogOpen(false)
      setSelectedUser(null)

      // Update users list locally
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, full_name: editForm.full_name, email: editForm.email }
            : user
        )
      )
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openEditDialog = (user: any) => {
    setSelectedUser(user)
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      role: getUserRole(user).toLowerCase(),
    })
    setEditDialogOpen(true)
  }

  const getUserRole = (user: any) => {
    if (!user.user_profile_roles || user.user_profile_roles.length === 0) {
      return "Unknown"
    }

    const roles = user.user_profile_roles.map((role: any) => role.user_roles.name)

    if (roles.includes("admin")) return "Admin"
    if (roles.includes("lender")) return "Lender"
    if (roles.includes("borrower")) return "Borrower"

    return "User"
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
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
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all users on the platform</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:w-[200px] lg:w-[300px]"
              />
            </div>
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

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="borrower">Borrowers</SelectItem>
                <SelectItem value="lender">Lenders</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.avatar_url || "/placeholder.svg"}
                              alt={user.full_name || "User"}
                            />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.full_name || "Unnamed User"}</div>
                            <div className="hidden text-xs text-gray-500 sm:block">
                              {user.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            getUserRole(user) === "Admin"
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : getUserRole(user) === "Lender"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-green-200 bg-green-50 text-green-700"
                          }
                        >
                          {getUserRole(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_blacklisted ? (
                          <Badge variant="destructive">Blacklisted</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-200 bg-green-50 text-green-700"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm text-gray-500 sm:table-cell">
                        {new Date(user.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            {!user.is_blacklisted && getUserRole(user) !== "Admin" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setBlacklistDialogOpen(true)
                                }}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Blacklist User
                              </DropdownMenuItem>
                            )}
                            {getUserRole(user) !== "Admin" && (
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedUser(user)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
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
              <p className="text-gray-500">No users found</p>
              {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("")
                    setRoleFilter("all")
                    setStatusFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blacklist Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist User</DialogTitle>
            <DialogDescription>
              Are you sure you want to blacklist {selectedUser?.full_name}? This action will prevent
              them from using the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for blacklisting
              </label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for blacklisting this user..."
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlacklistUser}
              disabled={!blacklistReason.trim()}
            >
              Blacklist User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedUser?.full_name}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="lender">Lender</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { UsersSection as AdminUsersSection }
