"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function BorrowerInvite() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    setLoading(true)
    try {
      // Send invitation logic here
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      toast.success("Invitation sent successfully!")
      setEmail("")
    } catch (error) {
      toast.error("Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Borrower</CardTitle>
        <CardDescription>
          Send an invitation to a borrower to join the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Invitation sent successfully!
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Borrower Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="borrower@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <Button onClick={handleInvite} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Invitation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default BorrowerInvite;
