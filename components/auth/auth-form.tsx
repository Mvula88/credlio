"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RoleSelector } from "@/components/auth/role-selector"
import { z } from "zod"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

const emailSchema = z.string().email("Please enter a valid email address")
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authMode, setAuthMode] = useState<"role-select" | "form">("role-select")
  const [formType, setFormType] = useState<"signin" | "signup">("signin")
  const [selectedRole, setSelectedRole] = useState<"borrower" | "lender" | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const router = useRouter()
  const supabase = createSupabaseClient()

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}

    try {
      emailSchema.parse(email)
    } catch (err) {
      if (err instanceof z.ZodError) {
        errors.email = err.errors[0].message
      }
    }

    if (formType === "signup") {
      try {
        passwordSchema.parse(password)
      } catch (err) {
        if (err instanceof z.ZodError) {
          errors.password = err.errors[0].message
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRoleSelect = (role: "borrower" | "lender") => {
    setSelectedRole(role)
    setAuthMode("form")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Check if user has the selected role
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, user_profile_roles(user_roles(role_name))")
          .eq("auth_user_id", data.user.id)
          .single()

        if (profile) {
          const userRoles = profile.user_profile_roles.map((r: any) => r.user_roles.role_name)

          if (!userRoles.includes(selectedRole)) {
            await supabase.auth.signOut()
            throw new Error(
              `This account is not registered as a ${selectedRole}. Please sign in with the correct role.`,
            )
          }

          // Redirect based on role
          if (selectedRole === "borrower") {
            router.push("/borrower/dashboard")
          } else {
            router.push("/lender/dashboard")
          }

          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
        },
      })

      if (error) throw error

      setSuccess("Please check your email for the confirmation link.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const backToRoleSelect = () => {
    setAuthMode("role-select")
    setSelectedRole(null)
    setError(null)
    setSuccess(null)
    setValidationErrors({})
  }

  if (authMode === "role-select") {
    return (
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Welcome to Credlio</CardTitle>
          <CardDescription className="text-blue-100">
            {formType === "signup" ? "Create a new account to get started" : "Sign in to your existing account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue={formType} onValueChange={(v) => setFormType(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-2">
              <RoleSelector onRoleSelect={handleRoleSelect} type="signin" />
            </TabsContent>
            <TabsContent value="signup" className="pt-2">
              <RoleSelector onRoleSelect={handleRoleSelect} type="signup" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-0">
      <CardHeader className="space-y-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <Button
          variant="ghost"
          className="mb-2 -ml-2 flex items-center text-white hover:text-white hover:bg-blue-500/20"
          onClick={backToRoleSelect}
        >
          ← Back
        </Button>
        <CardTitle className="text-2xl font-bold">
          {formType === "signup" ? "Create" : "Sign In to"} your {selectedRole} account
        </CardTitle>
        <CardDescription className="text-blue-100">
          {formType === "signup" ? `Register as a ${selectedRole} on Credlio` : `Access your ${selectedRole} dashboard`}
        </CardDescription>
      </CardHeader>
      <form onSubmit={formType === "signin" ? handleSignIn : handleSignUp}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={validationErrors.email ? "border-red-500" : ""}
            />
            {validationErrors.email && <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={validationErrors.password ? "border-red-500" : ""}
            />
            {validationErrors.password && <p className="text-sm text-red-500 mt-1">{validationErrors.password}</p>}
            {formType === "signup" && (
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and numbers.
              </p>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {formType === "signin" ? "Signing in..." : "Signing up..."}
              </>
            ) : formType === "signin" ? (
              "Sign In"
            ) : (
              "Sign Up"
            )}
          </Button>
          {formType === "signin" && (
            <Button variant="link" className="mt-2 text-sm text-blue-600">
              Forgot password?
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
