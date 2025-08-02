"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth"

interface SecureSignupFormProps {
  role: "borrower" | "lender"
}

export function SecureSignupForm({ role }: SecureSignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countries, setCountries] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)

  const router = useRouter()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  // Fetch countries from database
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from("countries")
          .select("id, code, name")
          .order("name")

        if (error) throw error
        if (data) setCountries(data)
      } catch (err) {
        console.error("Error fetching countries:", err)
        setError("Failed to load countries")
      } finally {
        setLoadingCountries(false)
      }
    }

    fetchCountries()
  }, [supabase])

  const onSubmit = async (data: SignUpInput) => {
    setLoading(true)
    setError("")

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Create profile in database
        const { error: profileError } = await supabase.from("profiles").insert({
          auth_user_id: authData.user.id,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          email: data.email,
          country_id: data.countryId,
        })

        if (profileError) throw profileError

        // Create user role assignment
        const { error: roleError } = await supabase.from("user_profile_roles").insert({
          profile_id: authData.user.id,
          role_name: role,
        })

        if (roleError) throw roleError

        // Show success message
        setError("")
        alert("Account created successfully! Please check your email to verify your account.")
        
        // Redirect to appropriate login page
        if (role === "borrower") {
          router.push("/login/borrower")
        } else {
          router.push("/login/lender")
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const countryValue = watch("countryId")

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create {role} account</CardTitle>
        <CardDescription>Sign up as a {role} to get started with Credlio</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              {...register("fullName")}
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              {...register("phoneNumber")}
              placeholder="+1234567890"
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
            )}
          </div>

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
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select 
              value={countryValue} 
              onValueChange={(value) => setValue("countryId", value, { shouldValidate: true })}
              disabled={loadingCountries}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCountries ? "Loading countries..." : "Select your country"} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.countryId && (
              <p className="text-sm text-red-500">{errors.countryId.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || loadingCountries}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}