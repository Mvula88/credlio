"use client"

import { useState } from "react"
import { InviteBorrowerForm } from "./invite-borrower-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { WhatsAppShareButton } from "@/components/whatsapp-share-button"
import { cancelInvitation } from "@/app/actions/invitations"
import { toast } from "sonner"
import { Copy, Check, RefreshCw, X } from "lucide-react"

type Invitation = {
  id: string
  invitation_code: string
  status: string
  created_at: string
  accepted_at: string | null
  expires_at: string
  borrower_name: string
  borrower_email: string | null
  borrower_phone: string | null
  registered_borrower_id: string | null
}

interface InvitationsSectionProps {
  invitations: Invitation[]
  lenderProfileId: string
}

export function InvitationsSection({ invitations, lenderProfileId }: InvitationsSectionProps) {
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)
  const [copied, setCopied] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending")
  const otherInvitations = invitations.filter((inv) => inv.status !== "pending")

  const handleCopyLink = (code: string) => {
    const inviteLink = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Invitation link copied to clipboard!")

    setTimeout(() => setCopied(false), 2000)
  }

  const handleResend = (invitation: Invitation) => {
    setSelectedInvitation(invitation)
    setIsResending(true)
  }

  const handleCancel = async (invitationId: string) => {
    setIsCancelling(true)

    try {
      const result = await cancelInvitation(invitationId)

      if (result.success) {
        toast.success("Invitation cancelled successfully")
        // Close dialog if open
        setSelectedInvitation(null)
      } else {
        toast.error(result.error || "Failed to cancel invitation")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsCancelling(false)
    }
  }

  const getWhatsAppMessage = (invitation: Invitation) => {
    const inviteLink = `${window.location.origin}/invite/${invitation.invitation_code}`
    return `Hello ${invitation.borrower_name}, I'd like to invite you to join Credlio to manage our loan agreement. It's a secure platform that helps us track payments and maintain records. Here's your invitation link: ${inviteLink}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Accepted
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Expired
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Borrower Invitations</h2>
        <InviteBorrowerForm />
      </div>

      {pendingInvitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>These invitations are waiting for borrowers to accept.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.borrower_name}</TableCell>
                    <TableCell>{formatDate(invitation.created_at)}</TableCell>
                    <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopyLink(invitation.invitation_code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleResend(invitation)}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCancel(invitation.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Pending Invitations</CardTitle>
            <CardDescription>You don't have any pending invitations. Create one to invite a borrower.</CardDescription>
          </CardHeader>
          <CardFooter>
            <InviteBorrowerForm />
          </CardFooter>
        </Card>
      )}

      {otherInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Invitations</CardTitle>
            <CardDescription>History of your previous invitations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.borrower_name}</TableCell>
                    <TableCell>{formatDate(invitation.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>{invitation.accepted_at ? formatDate(invitation.accepted_at) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Resend Dialog */}
      <Dialog
        open={!!selectedInvitation && isResending}
        onOpenChange={() => {
          setSelectedInvitation(null)
          setIsResending(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend Invitation</DialogTitle>
            <DialogDescription>Resend the invitation to {selectedInvitation?.borrower_name}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">Invitation Link</p>
              <div className="flex items-center mt-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm flex-1 overflow-x-auto">
                  {selectedInvitation && `${window.location.origin}/invite/${selectedInvitation.invitation_code}`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedInvitation && handleCopyLink(selectedInvitation.invitation_code)}
                  className="ml-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {selectedInvitation && selectedInvitation.borrower_phone && (
              <WhatsAppShareButton
                message={getWhatsAppMessage(selectedInvitation)}
                phoneNumber={selectedInvitation.borrower_phone}
                className="w-full sm:w-auto"
              />
            )}

            {selectedInvitation && !selectedInvitation.borrower_phone && (
              <WhatsAppShareButton message={getWhatsAppMessage(selectedInvitation)} className="w-full sm:w-auto" />
            )}

            <Button
              variant="outline"
              onClick={() => {
                setSelectedInvitation(null)
                setIsResending(false)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
