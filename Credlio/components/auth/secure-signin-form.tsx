"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Lock, AlertCircle, Eye, EyeOff, Shield, Smartphone } from "lucide-react"
import { generateDeviceFingerprint } from "@/lib/auth/secure-auth-utils"
import Link from "next/link"

export function SecureSigninForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [requiresDeviceVerification, setRequiresDeviceVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  // Check if this is a new account
  const isNewAccount = searchParams.get("newAccount") === "true"

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!credentials.username || !credentials.password) {
        throw new Error("Please enter both username and password")
      }

      // Generate device fingerprint
      const headers = new Headers()
      headers.append('User-Agent', window.navigator.userAgent)
      const deviceFingerprint = generateDeviceFingerprint(headers)

      // First, get the email associated with this username
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, id, failed_login_attempts, account_locked_until")
        .eq("username", credentials.username.toUpperCase())
        .single()

      if (!profile) {
        // Log failed attempt
        await supabase
          .from("login_attempts")
          .insert({
            username: credentials.username,
            ip_address: window.location.hostname,
            device_fingerprint: deviceFingerprint,
            success: false,
            failure_reason: "Invalid username"
          })
        
        throw new Error("Invalid username or password")
      }

      // Check if account is locked
      if (profile.account_locked_until && new Date(profile.account_locked_until) > new Date()) {
        const lockTime = new Date(profile.account_locked_until).toLocaleTimeString()
        throw new Error(`Account is locked until ${lockTime} due to multiple failed login attempts`)
      }

      // Check if this is a trusted device
      const { data: trustedDevice } = await supabase
        .from("user_devices")
        .select("is_trusted")
        .eq("user_id", profile.id)
        .eq("device_fingerprint", deviceFingerprint)
        .single()

      // If not a trusted device, we'll need additional verification
      if (!trustedDevice?.is_trusted && !isNewAccount) {
        setRequiresDeviceVerification(true)
        // In a real app, you'd send an SMS/email here
        return
      }

      // Attempt sign in with email (from username lookup)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: credentials.password
      })

      if (authError) {
        // Increment failed attempts
        const newFailedAttempts = (profile.failed_login_attempts || 0) + 1
        const updates: any = { failed_login_attempts: newFailedAttempts }
        
        // Lock account after 3 failed attempts
        if (newFailedAttempts >= 3) {
          const lockUntil = new Date()
          lockUntil.setHours(lockUntil.getHours() + 1) // Lock for 1 hour
          updates.account_locked_until = lockUntil.toISOString()
        }
        
        await supabase
          .from("profiles")
          .update(updates)
          .eq("id", profile.id)

        // Log failed attempt
        await supabase
          .from("login_attempts")
          .insert({
            username: credentials.username,
            ip_address: window.location.hostname,
            device_fingerprint: deviceFingerprint,
            success: false,
            failure_reason: "Invalid password"
          })

        throw new Error("Invalid username or password")
      }

      // Reset failed attempts on successful login
      await supabase
        .from("profiles")
        .update({ 
          failed_login_attempts: 0,
          account_locked_until: null 
        })
        .eq("id", profile.id)

      // Log successful attempt
      await supabase
        .from("login_attempts")
        .insert({
          username: credentials.username,
          ip_address: window.location.hostname,
          device_fingerprint: deviceFingerprint,
          success: true
        })

      // Update or create device record
      await supabase
        .from("user_devices")
        .upsert({
          user_id: profile.id,
          device_fingerprint: deviceFingerprint,
          last_used: new Date().toISOString(),
          is_trusted: isNewAccount // Trust first device after signup
        })

      // Get user role for proper redirect
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", profile.id)
        .single()

      // Redirect based on role
      switch (userProfile?.role) {
        case "borrower":
          router.push("/borrower/dashboard")
          break
        case "lender":
          router.push("/lender/dashboard")
          break
        case "admin":
        case "super_admin":
          router.push("/super-admin/dashboard")
          break
        case "country_admin":
          router.push("/admin/country")
          break
        default:
          router.push("/dashboard")
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeviceVerification = async () => {
    // In a real app, verify the code sent via SMS/email
    if (verificationCode === "123456") { // Demo code
      // Mark device as trusted and continue login
      const headers = new Headers()
      headers.append('User-Agent', window.navigator.userAgent)
      const deviceFingerprint = generateDeviceFingerprint(headers)
      
      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", credentials.username.toUpperCase())
        .single()

      if (profile) {
        await supabase
          .from("user_devices")
          .update({ is_trusted: true, trusted_at: new Date().toISOString() })
          .eq("user_id", profile.id)
          .eq("device_fingerprint", deviceFingerprint)
      }

      // Retry login
      setRequiresDeviceVerification(false)
      handleSignin(new Event('submit') as any)
    } else {
      setError("Invalid verification code")
    }
  }

  if (requiresDeviceVerification) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>New Device Detected</CardTitle>
          <CardDescription>
            We've sent a verification code to your registered phone/email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Demo: Use code 123456
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleDeviceVerification} className="w-full">
            Verify Device
          </Button>

          <Button
            variant="ghost"
            onClick={() => setRequiresDeviceVerification(false)}
            className="w-full"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Secure Sign In</CardTitle>
        <CardDescription>
          Enter your username and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isNewAccount && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Account created successfully! Please sign in with your username and password.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="CRD-KE-2024-A7B9X"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="pl-10 font-mono"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the username provided during registration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center space-y-2 pt-4">
            <Link href="/auth/forgot-username" className="text-sm text-primary hover:underline">
              Forgot Username?
            </Link>
            <span className="text-sm text-muted-foreground mx-2">•</span>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New to Credlio?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link href="/auth/signup" className="text-sm text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}