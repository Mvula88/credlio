"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, ShieldCheck, AlertCircle } from "lucide-react"

interface OTPVerificationProps {
  email: string
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onCancel: () => void
}

export function OTPVerification({ email, onVerify, onResend, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    // Handle resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newOtp.every(digit => digit)) {
      handleVerify(newOtp.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, "").slice(0, 6)
        if (digits.length === 6) {
          const newOtp = digits.split("")
          setOtp(newOtp)
          inputRefs.current[5]?.focus()
          handleVerify(digits)
        }
      })
    }
  }

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join("")
    if (code.length !== 6) {
      setError("Please enter all 6 digits")
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      await onVerify(code)
    } catch (error: any) {
      setError(error.message || "Invalid verification code")
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)

    try {
      await onResend()
      setResendCooldown(60) // 60 second cooldown
      // Clear OTP fields
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch (error: any) {
      setError(error.message || "Failed to resend code")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>
          We've sent a verification email to <strong>{email}</strong>.
          <br />
          <span className="text-xs mt-2 block">
            Click the magic link in the email to sign in instantly, or copy the 6-digit code from the link and paste it below.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="otp" className="text-center block mb-3">
            Or manually enter the verification code
          </Label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold"
                disabled={isVerifying}
              />
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => handleVerify()}
            className="w-full"
            disabled={isVerifying || otp.some(d => !d)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0 || isVerifying}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <>
                  <Mail className="mr-2 h-3 w-3" />
                  Resend Code
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Didn't receive the email? Check your spam folder</p>
          <p className="mt-2 text-xs">Click the link in the email for instant verification</p>
        </div>
      </CardContent>
    </Card>
  )
}