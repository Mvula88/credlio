"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { WhatsAppShareButton } from "@/components/whatsapp-share-button"
import { createInvitation } from "@/app/actions/invitations"
import { UserPlus, Copy, Check } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
  borrowerName: z.string().min(2, {
    message: "Borrower name must be at least 2 characters.",
  }),
  borrowerEmail: z.string().email().optional().or(z.literal("")),
  borrowerPhone: z.string().optional().or(z.literal("")),
  customMessage: z.string().optional().or(z.literal("")),
  loanAmount: z.number().positive().optional().or(z.literal("")),
  loanTermMonths: z.number().int().positive().optional().or(z.literal("")),
  interestRate: z.number().positive().optional().or(z.literal("")),
})

export function InviteBorrowerForm() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitationCode, setInvitationCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      borrowerName: "",
      borrowerEmail: "",
      borrowerPhone: "",
      customMessage:
        "I'd like to invite you to join Credlio to manage our loan agreement. It's a secure platform that helps us track payments and maintain records.",
      loanAmount: undefined,
      loanTermMonths: undefined,
      interestRate: undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      const result = await createInvitation({
        borrowerName: values.borrowerName,
        borrowerEmail: values.borrowerEmail || undefined,
        borrowerPhone: values.borrowerPhone || undefined,
        customMessage: values.customMessage || undefined,
        loanAmount: values.loanAmount ? Number(values.loanAmount) : undefined,
        loanTermMonths: values.loanTermMonths ? Number(values.loanTermMonths) : undefined,
        interestRate: values.interestRate ? Number(values.interestRate) : undefined,
      })

      if (result.success) {
        setInvitationCode(result.invitationCode)
        toast.success("Invitation created successfully!")
      } else {
        toast.error(result.error || "Failed to create invitation")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    if (!invitationCode) return

    const inviteLink = `${window.location.origin}/invite/${invitationCode}`
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Invitation link copied to clipboard!")

    setTimeout(() => setCopied(false), 2000)
  }

  const getWhatsAppMessage = () => {
    if (!invitationCode) return ""

    const inviteLink = `${window.location.origin}/invite/${invitationCode}`
    const borrowerName = form.getValues("borrowerName")
    const customMessage = form.getValues("customMessage")

    return `Hello ${borrowerName}, ${customMessage || "I'd like to invite you to join Credlio."} Here's your invitation link: ${inviteLink}`
  }

  const resetForm = () => {
    form.reset()
    setInvitationCode(null)
    setCopied(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Borrower
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite a Borrower</DialogTitle>
          <DialogDescription>
            Create an invitation link to send to a borrower you're working with outside the platform.
          </DialogDescription>
        </DialogHeader>

        {!invitationCode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="borrowerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Borrower Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="borrowerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="borrowerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a custom message to send with the invitation"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This message will be included in the WhatsApp share.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanTermMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term (Months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="12"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5.5"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">Invitation created successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share this invitation link with {form.getValues("borrowerName")}:
              </p>
              <div className="flex items-center mt-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm flex-1 overflow-x-auto">
                  {window.location.origin}/invite/{invitationCode}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="ml-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <WhatsAppShareButton
                message={getWhatsAppMessage()}
                phoneNumber={form.getValues("borrowerPhone")}
                className="w-full"
              />

              <Button variant="outline" onClick={resetForm}>
                Create Another Invitation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
