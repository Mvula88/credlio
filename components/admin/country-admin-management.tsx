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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Search, Plus, Trash2, Edit, Globe, Users } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import type { Database } from "@/lib/types/database"

interface CountryAdmin {
  id: string
  profile_id: string
  country_id: string
  is_active: boolean
  assigned_at: string
  permissions: any
  profiles: {
    full_name: string
    email: string
    profile_picture_url: string | null
  }
  countries: {
    name: string
    code: string
  }
}

interface Country {
  id: string
  name: string
  code: string
}

interface User {
  id: string
  full_name: string
  email: string
  profile_picture_url: string | null
}

export function CountryAdminManagement() {
  const [countryAdmins, setCountryAdmins] = useState<CountryAdmin[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<CountryAdmin | null>(null)
  const [newAdmin, setNewAdmin] = useState({
    profile_id: "",
    country_id: "",
    permissions: {
      can_manage_users: true,
      can_view_analytics: true,
      can_manage_blacklist: true,
      can_approve_loans: false,
    },
  })

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch country admins
      const { data: adminData, error: adminError } = await supabase
        .from("country_admins")
        .select(
          `
          *,
          profiles (
            full_name,
            email,
            profile_picture_url
          ),
          countries (
            name,
            code
          )
        `
        )
        .order("assigned_at", { ascending: false })

      if (adminError) throw adminError

      // Fetch countries
      const { data: countryData, error: countryError } = await supabase
        .from("countries")
        .select("*")
        .order("name")

      if (countryError) throw countryError

      // Fetch users (potential admins)
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, full_name, email, profile_picture_url")
        .order("full_name")

      if (userError) throw userError

      setCountryAdmins(adminData || [])
      setCountries(countryData || [])
      setUsers(userData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.profile_id || !newAdmin.country_id) return

    try {
      const { error } = await supabase.from("country_admins").insert({
        profile_id: newAdmin.profile_id,
        country_id: newAdmin.country_id,
        permissions: newAdmin.permissions,
      })

      if (error) throw error

      // Also assign country_admin role to the user
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role_name", "country_admin")
        .single()

      if (roleData) {
        await supabase.from("user_profile_roles").insert({
          profile_id: newAdmin.profile_id,
          role_id: roleData.id,
        })
      }

      setAddDialogOpen(false)
      setNewAdmin({
        profile_id: "",
        country_id: "",
        permissions: {
          can_manage_users: true,
          can_view_analytics: true,
          can_manage_blacklist: true,
          can_approve_loans: false,
        },
      })
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return

    try {
      const { error } = await supabase.from("country_admins").delete().eq("id", selectedAdmin.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setSelectedAdmin(null)
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleToggleActive = async (admin: CountryAdmin) => {
    try {
      const { error } = await supabase
        .from("country_admins")
        .update({ is_active: !admin.is_active })
        .eq("id", admin.id)

      if (error) throw error

      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filteredAdmins = countryAdmins.filter(
    (admin) =>
      admin.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.profiles.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.countries.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Country Admin Management
            </CardTitle>
            <CardDescription>
              Manage regional administrators for different countries
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:w-[200px] lg:w-[300px]"
              />
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Country Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            </div>
          ) : filteredAdmins.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="hidden sm:table-cell">Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={admin.profiles.profile_picture_url || "/placeholder.svg"}
                              alt={admin.profiles.full_name || "Admin"}
                            />
                            <AvatarFallback>{getInitials(admin.profiles.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {admin.profiles.full_name || "Unnamed Admin"}
                            </div>
                            <div className="hidden text-xs text-gray-500 sm:block">
                              {admin.profiles.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            {admin.countries.code}
                          </Badge>
                          <span className="hidden sm:inline">{admin.countries.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={admin.is_active ? "default" : "secondary"}
                          className={
                            admin.is_active
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.can_manage_users && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="mr-1 h-3 w-3" />
                              Users
                            </Badge>
                          )}
                          {admin.permissions.can_view_analytics && (
                            <Badge variant="outline" className="text-xs">
                              Analytics
                            </Badge>
                          )}
                          {admin.permissions.can_manage_blacklist && (
                            <Badge variant="outline" className="text-xs">
                              Blacklist
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-gray-500 sm:table-cell">
                        {new Date(admin.assigned_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(admin)}
                            className={admin.is_active ? "text-orange-600" : "text-green-600"}
                          >
                            {admin.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin)
                              setEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAdmin(admin)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border bg-gray-50 py-10 text-center">
              <Globe className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No country admins found</p>
              <Button variant="link" onClick={() => setAddDialogOpen(true)}>
                Add your first country admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Country Admin</DialogTitle>
            <DialogDescription>
              Assign a user as administrator for a specific country
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select
                value={newAdmin.profile_id}
                onValueChange={(value) => setNewAdmin({ ...newAdmin, profile_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={user.profile_picture_url || "/placeholder.svg"}
                            alt={user.full_name}
                          />
                          <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Country</label>
              <Select
                value={newAdmin.country_id}
                onValueChange={(value) => setNewAdmin({ ...newAdmin, country_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{country.code}</Badge>
                        {country.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Permissions</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manage_users"
                    checked={newAdmin.permissions.can_manage_users}
                    onCheckedChange={(checked) =>
                      setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, can_manage_users: checked },
                      })
                    }
                  />
                  <label htmlFor="manage_users" className="text-sm">
                    Manage Users
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="view_analytics"
                    checked={newAdmin.permissions.can_view_analytics}
                    onCheckedChange={(checked) =>
                      setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, can_view_analytics: checked },
                      })
                    }
                  />
                  <label htmlFor="view_analytics" className="text-sm">
                    View Analytics
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manage_blacklist"
                    checked={newAdmin.permissions.can_manage_blacklist}
                    onCheckedChange={(checked) =>
                      setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, can_manage_blacklist: checked },
                      })
                    }
                  />
                  <label htmlFor="manage_blacklist" className="text-sm">
                    Manage Blacklist
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approve_loans"
                    checked={newAdmin.permissions.can_approve_loans}
                    onCheckedChange={(checked) =>
                      setNewAdmin({
                        ...newAdmin,
                        permissions: { ...newAdmin.permissions, can_approve_loans: checked },
                      })
                    }
                  />
                  <label htmlFor="approve_loans" className="text-sm">
                    Approve Loans
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAdmin}
              disabled={!newAdmin.profile_id || !newAdmin.country_id}
            >
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Country Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedAdmin?.profiles.full_name} as admin for{" "}
              {selectedAdmin?.countries.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdmin}>
              Remove Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
