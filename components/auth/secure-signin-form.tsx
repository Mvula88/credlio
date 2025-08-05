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
import { toast } from "sonner"

export function SecureSigninForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  const [credentials, setCredentials] = useState({
    email: "",
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
      if (!credentials.email || !credentials.password) {
        throw new Error("Please enter both email and password")
      }

      // Generate device fingerprint
      const headers = new Headers()
      headers.append('User-Agent', window.navigator.userAgent)
      const deviceFingerprint = generateDeviceFingerprint(headers)

      // Skip profile checks for now to speed up login
      // These can be done after successful authentication

      // Sign in with password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (authError) {
        console.error("Auth Error:", authError)
        throw new Error("Invalid email or password")
      }

      if (!data.user) {
        throw new Error("Failed to sign in")
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, country_id")
        .eq("auth_user_id", data.user.id)
        .single()

      // Generate and store device fingerprint
      const deviceFingerprint = generateDeviceFingerprint(headers)
      
      if (profile?.id) {
        await supabase
          .from("user_devices")
          .upsert({
            user_id: profile.id,
            device_fingerprint: deviceFingerprint,
            last_used: new Date().toISOString(),
            is_trusted: true
          })
      }

      // Check if country is set
      if (!profile?.country_id) {
        router.push("/auth/select-country")
      } else {
        // Redirect based on role
        switch (profile?.role) {
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
      }
      
      toast.success("Successfully signed in!")
      return

    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
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
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the email you used during registration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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