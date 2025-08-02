"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { signInSchema, type SignInInput } from "@/lib/validations/auth"

interface SecureSigninFormProps {
  role: "borrower" | "lender"
}

export function SecureSignInForm({ role }: SecureSigninFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInInput) => {
    setLoading(true)
    setError("")

    try {
      // Sign in user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password")
        }
        throw authError
      }

      if (authData.user) {
        // Fetch user profile to verify role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*, user_profile_roles!inner(role_name)")
          .eq("auth_user_id", authData.user.id)
          .single()

        if (profileError) {
          console.error("Profile error:", profileError)
          throw new Error("Unable to fetch user profile")
        }

        // Check if user has the correct role
        const userRoles = profile.user_profile_roles
        const hasRole = Array.isArray(userRoles) 
          ? userRoles.some((r: any) => r.role_name === role)
          : userRoles?.role_name === role

        if (!hasRole) {
          await supabase.auth.signOut()
          throw new Error(`This account is not registered as a ${role}`)
        }

        // Redirect based on role
        if (role === "borrower") {
          router.push("/borrower-disclaimer")
        } else if (role === "lender") {
          router.push("/lender-disclaimer")
        }
      }
    } catch (err: any) {
      console.error("Signin error:", err)
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign in as {role}</CardTitle>
        <CardDescription>Welcome back! Sign in to your {role} account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}