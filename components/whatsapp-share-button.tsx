"use client"

import { Button } from "@/components/ui/button"
import { Share } from "lucide-react"

interface WhatsAppShareButtonProps {
  message: string
  phoneNumber?: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function WhatsAppShareButton({
  message,
  phoneNumber,
  className,
  variant = "default",
}: WhatsAppShareButtonProps) {
  const handleShare = () => {
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message)

    // Create the WhatsApp URL
    let whatsappUrl = "https://wa.me/"

    // Add phone number if provided
    if (phoneNumber) {
      // Remove any non-numeric characters from the phone number
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, "")
      whatsappUrl += cleanPhoneNumber
    }

    // Add the message
    whatsappUrl += `?text=${encodedMessage}`

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank")
  }

  return (
    <Button onClick={handleShare} className={className} variant={variant}>
      <Share className="mr-2 h-4 w-4" />
      Share via WhatsApp
    </Button>
  )
}
