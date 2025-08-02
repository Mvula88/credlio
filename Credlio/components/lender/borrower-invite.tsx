"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  UserPlus,
  Send,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Loader2,
  ExternalLink,
} from "lucide-react"
import type { BorrowerInvite } from "@/lib/types/bureau"

interface BorrowerInviteSectionProps {
  lenderId: string
}

export function BorrowerInviteSection({ lenderId }: BorrowerInviteSectionProps) {
  const [invites, setInvites] = useState<BorrowerInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    borrower_name: "",
    borrower_phone: "",
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInvites()
  }, [lenderId])

  async function fetchInvites() {
    try {
      const { data } = await supabase
        .from("borrower_invites")
        .select("*")
        .eq("lender_id", lenderId)
        .order("created_at", { ascending: false })

      setInvites(data || [])
    } catch (error) {
      console.error("Error fetching invites:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendInvite() {
    setSending(true)
    try {
      // Generate invite code
      const inviteCode = generateInviteCode()

      // Create WhatsApp link
      const baseUrl = window.location.origin
      const inviteUrl = `${baseUrl}/borrower/accept-invitation/${inviteCode}`
      const message = encodeURIComponent(
        `Hi ${formData.borrower_name}, \n\n` +
          `You've been invited to join Credlio, a professional borrower reputation platform.\n\n` +
          `Join using this link: ${inviteUrl}\n\n` +
          `Or use invite code: ${inviteCode}\n\n` +
          `This will help you build your credit reputation and access loans from verified lenders.`
      )
      const whatsappLink = `https://wa.me/${formData.borrower_phone}?text=${message}`

      // Save invite to database
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const { error } = await supabase.from("borrower_invites").insert({
        lender_id: lenderId,
        borrower_name: formData.borrower_name,
        borrower_phone: formData.borrower_phone,
        invite_code: inviteCode,
        whatsapp_link: whatsappLink,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      // Open WhatsApp
      window.open(whatsappLink, "_blank")

      // Refresh invites
      await fetchInvites()
      setShowInviteDialog(false)
      resetForm()
    } catch (error) {
      console.error("Error sending invite:", error)
      alert("Failed to create invite")
    } finally {
      setSending(false)
    }
  }

  function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  function resetForm() {
    setFormData({
      borrower_name: "",
      borrower_phone: "",
    })
  }

  async function copyInviteLink(invite: BorrowerInvite) {
    const baseUrl = window.location.origin
    const inviteUrl = `${baseUrl}/borrower/accept-invitation/${invite.invite_code}`

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(invite.id)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusBadge = (invite: BorrowerInvite) => {
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)

    if (invite.status === "accepted") {
      return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
    } else if (invite.status === "expired" || expiresAt < now) {
      return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
    }
  }

  const pendingInvites = invites.filter(
    (i) => i.status === "pending" && new Date(i.expires_at) > new Date()
  )
  const acceptedInvites = invites.filter((i) => i.status === "accepted")
  const expiredInvites = invites.filter(
    (i) => i.status === "expired" || new Date(i.expires_at) < new Date()
  )

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
                <UserPlus className="h-5 w-5" />
                Borrower Invitations
              </CardTitle>
              <CardDescription>
                Invite off-platform borrowers via WhatsApp to build their reputation
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending ({pendingInvites.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({acceptedInvites.length})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({expiredInvites.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {pendingInvites.length === 0 ? (
                <Alert>
                  <AlertDescription>No pending invitations</AlertDescription>
                </Alert>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invite.borrower_name || "Unknown"}</p>
                        {getStatusBadge(invite)}
                      </div>
                      <p className="text-sm text-gray-600">{invite.borrower_phone}</p>
                      <p className="text-xs text-gray-500">
                        Sent on {formatDate(invite.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyInviteLink(invite)}>
                        {copied === invite.id ? (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </Button>
                      {invite.whatsapp_link && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invite.whatsapp_link, "_blank")}
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-3">
              {acceptedInvites.length === 0 ? (
                <Alert>
                  <AlertDescription>No accepted invitations yet</AlertDescription>
                </Alert>
              ) : (
                acceptedInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invite.borrower_name || "Unknown"}</p>
                        {getStatusBadge(invite)}
                      </div>
                      <p className="text-sm text-gray-600">{invite.borrower_phone}</p>
                      <p className="text-xs text-gray-500">
                        Accepted on {invite.accepted_at ? formatDate(invite.accepted_at) : "N/A"}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="expired" className="space-y-3">
              {expiredInvites.length === 0 ? (
                <Alert>
                  <AlertDescription>No expired invitations</AlertDescription>
                </Alert>
              ) : (
                expiredInvites.map((invite) => (
                  <div key={invite.id} className="rounded-lg border p-4 opacity-60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invite.borrower_name || "Unknown"}</p>
                        {getStatusBadge(invite)}
                      </div>
                      <p className="text-sm text-gray-600">{invite.borrower_phone}</p>
                      <p className="text-xs text-gray-500">
                        Expired on {formatDate(invite.expires_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>

          <Alert className="mt-4">
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              Invitations are sent via WhatsApp and expire after 7 days. Borrowers can use the
              invite link or code to join the platform.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Send Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Borrower Invitation</DialogTitle>
            <DialogDescription>
              Invite a borrower to join Credlio and start building their credit reputation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Borrower Name</Label>
              <Input
                placeholder="John Doe"
                value={formData.borrower_name}
                onChange={(e) => setFormData({ ...formData, borrower_name: e.target.value })}
              />
            </div>

            <div>
              <Label>WhatsApp Number</Label>
              <Input
                placeholder="+1234567890"
                value={formData.borrower_phone}
                onChange={(e) => setFormData({ ...formData, borrower_phone: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +1 for US, +254 for Kenya)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!formData.borrower_name || !formData.borrower_phone || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send via WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
