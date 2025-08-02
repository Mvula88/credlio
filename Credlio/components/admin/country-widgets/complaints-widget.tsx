"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, MessageSquare, User } from "lucide-react"
import type { SupportedCountry } from "@/lib/types/bureau"

interface ComplaintsWidgetProps {
  country: SupportedCountry
}

export function ComplaintsWidget({ country }: ComplaintsWidgetProps) {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchComplaints()
  }, [country])

  async function fetchComplaints() {
    try {
      // Fetch complaints for this country
      const { data } = await supabase
        .from("complaints")
        .select(`
          *,
          complainant:profiles!complaints_complainant_id_fkey(full_name, email, country_id),
          respondent:profiles!complaints_respondent_id_fkey(full_name, email, country_id),
          country:countries!inner(code)
        `)
        .eq("country.code", country)
        .order("created_at", { ascending: false })
        .limit(10)

      if (data) {
        setComplaints(data)
        
        // Calculate stats
        const stats = data.reduce((acc, complaint) => {
          acc.total++
          if (complaint.status === 'pending') acc.pending++
          else if (complaint.status === 'in_progress') acc.inProgress++
          else if (complaint.status === 'resolved') acc.resolved++
          return acc
        }, { total: 0, pending: 0, inProgress: 0, resolved: 0 })
        
        setStats(stats)
      }
    } catch (error) {
      console.error("Error fetching complaints:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateComplaintStatus(complaintId: string, newStatus: string) {
    try {
      await supabase
        .from("complaints")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", complaintId)
      
      // Refresh complaints
      fetchComplaints()
    } catch (error) {
      console.error("Error updating complaint:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Complaints Management
            </CardTitle>
            <CardDescription>Handle user complaints and disputes</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{stats.total} Total</Badge>
            <Badge variant="destructive">{stats.pending} Pending</Badge>
            <Badge variant="secondary">{stats.inProgress} In Progress</Badge>
            <Badge variant="default">{stats.resolved} Resolved</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Complainant</TableHead>
              <TableHead>Against</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.map((complaint) => (
              <TableRow key={complaint.id}>
                <TableCell className="text-sm">
                  {new Date(complaint.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {complaint.complaint_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="text-sm">{complaint.complainant?.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="text-sm">{complaint.respondent?.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      complaint.status === 'resolved' ? 'default' : 
                      complaint.status === 'pending' ? 'destructive' : 
                      'secondary'
                    }
                  >
                    {complaint.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">View</Button>
                    {complaint.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateComplaintStatus(
                          complaint.id, 
                          complaint.status === 'pending' ? 'in_progress' : 'resolved'
                        )}
                      >
                        {complaint.status === 'pending' ? 'Start' : 'Resolve'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {complaints.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No complaints found for this country</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}