"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, User, Lock, Calendar, CreditCard, AlertCircle, CheckCircle, Eye, EyeOff, Copy } from "lucide-react"
import { 
  generateUsername, 
  hashSensitiveData, 
  validateIDNumber, 
  checkPasswordStrength,
  validateDateOfBirth 
} from "@/lib/auth/secure-auth-utils"
import type { SupportedCountry } from "@/lib/types/bureau"
import { SUPPORTED_COUNTRIES } from "@/lib/constants/countries"

interface SecureSignupFormProps {
  role: "borrower" | "lender"
  selectedCountry?: SupportedCountry
}

export function SecureSignupForm({ role, selectedCountry }: SecureSignupFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null)
  const [showUsernameDialog, setShowUsernameDialog] = useState(false)
  const [usernameCopied, setUsernameCopied] = useState(false)
  const [invitationCode, setInvitationCode] = useState<string | null>(null)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  // Form fields
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    idType: "national_id" as "national_id" | "passport",
    idNumber: "",
    dateOfBirth: "",
    country: selectedCountry || "",
    acceptTerms: false
  })
  
  // Validation states
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, score: 0, feedback: [] as string[] })
  const [idValid, setIdValid] = useState<boolean | null>(null)
  
  // Handle invitation parameters
  useEffect(() => {
    const invitation = searchParams.get('invitation')
    const email = searchParams.get('email')
    
    if (invitation) {
      setInvitationCode(invitation)
    }
    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
    }
  }, [searchParams])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation
    if (field === "password") {
      setPasswordStrength(checkPasswordStrength(value))
    }
    
    if (field === "idNumber" && formData.country && formData.idType) {
      setIdValid(validateIDNumber(value, formData.idType, formData.country))
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validate all fields
      if (!formData.fullName || !formData.email || !formData.password) {
        throw new Error("Please fill in all required fields")
      }

      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Validate password strength
      if (!passwordStrength.isValid) {
        throw new Error("Password does not meet security requirements")
      }

      // Validate ID number
      if (!validateIDNumber(formData.idNumber, formData.idType, formData.country)) {
        throw new Error("Invalid ID number format for selected country")
      }

      // Validate age
      if (!validateDateOfBirth(formData.dateOfBirth)) {
        throw new Error("You must be at least 18 years old to use this platform")
      }

      // Hash the ID number
      const idHash = hashSensitiveData(formData.idNumber)

      // Check for duplicate ID
      const { data: duplicateCheck } = await supabase
        .rpc('check_duplicate_identity', {
          p_national_id_hash: idHash,
          p_full_name: formData.fullName,
          p_date_of_birth: formData.dateOfBirth
        })

      if (duplicateCheck && duplicateCheck[0]?.is_duplicate) {
        throw new Error("An account already exists with this ID number. Please sign in instead.")
      }

      // Fetch country UUID from country code
      let countryId = formData.country
      if (formData.country && formData.country.length === 2) {
        const { data: countryData } = await supabase
          .from("countries")
          .select("id")
          .eq("code", formData.country)
          .single()
        
        if (countryData) {
          countryId = countryData.id
        }
      }

      // Generate unique username
      const username = await generateUniqueUsername(formData.country)
      
      // Create auth user - Supabase will handle confirmation email via Resend SMTP
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: username,
            role: role,
            country: formData.country
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Update the automatically created profile with additional data
        // The trigger creates the basic profile, we just update it with more details
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            phone: formData.phone,
            national_id_hash: idHash,
            id_type: formData.idType,
            date_of_birth: formData.dateOfBirth,
            country_id: countryId,  // Use the UUID instead of country code
            id_verified: false
          })
          .eq('auth_user_id', authData.user.id)

        if (profileError) {
          // If update fails, try insert (fallback for cases where trigger didn't fire)
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              auth_user_id: authData.user.id,
              email: formData.email,
              full_name: formData.fullName,
              username: username,
              phone: formData.phone,
              role: role,
              national_id_hash: idHash,
              id_type: formData.idType,
              date_of_birth: formData.dateOfBirth,
              country_id: countryId,
              id_verified: false
            })
          
          if (insertError) throw insertError
        }

        // Store identity verification record
        await supabase
          .from("identity_verifications")
          .insert({
            national_id_hash: idHash,
            full_name: formData.fullName,
            date_of_birth: formData.dateOfBirth,
            id_type: formData.idType,
            country_code: formData.country,
            verified_profile_id: authData.user.id
          })

        // Handle invitation if present
        if (invitationCode && role === 'borrower') {
          // Use the secure function to accept invitation
          const { data: accepted, error: inviteError } = await supabase
            .rpc('accept_invitation', {
              p_invitation_code: invitationCode,
              p_borrower_id: authData.user.id
            })
            
          if (inviteError) {
            console.error('Error accepting invitation:', inviteError)
          } else if (accepted) {
            console.log('Invitation accepted successfully')
          }
        }

        // Show username to user (ONLY TIME THEY SEE IT)
        setGeneratedUsername(username)
        
        // Show success toast for email sent
        toast.success("Confirmation email sent!", {
          description: `Check ${formData.email} for your confirmation link`,
          duration: 5000,
        })
        
        // Show email confirmation message
        // Supabase has already sent the confirmation email via Resend SMTP
        setShowEmailConfirmation(true)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const generateUniqueUsername = async (country: string): Promise<string> => {
    const { data, error } = await supabase
      .rpc('generate_unique_username', { country_code: country })
    
    if (error || !data) {
      // Fallback to client-side generation
      return generateUsername(country)
    }
    
    return data
  }

  const copyUsername = () => {
    if (generatedUsername) {
      navigator.clipboard.writeText(generatedUsername)
      setUsernameCopied(true)
      setTimeout(() => setUsernameCopied(false), 2000)
    }
  }

  const proceedAfterUsername = () => {
    // Redirect to sign in page
    router.push("/auth/signin?newAccount=true")
  }

  const resendConfirmationEmail = async () => {
    setResendingEmail(true)
    setResendSuccess(false)
    
    try {
      console.log('Resending confirmation email to:', formData.email)
      
      // Show loading toast
      const loadingToast = toast.loading("Sending confirmation email...")
      
      // Use Supabase's resend method - it will send via Resend SMTP
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      // Dismiss loading toast
      toast.dismiss(loadingToast)
      
      if (error) throw error
      
      setResendSuccess(true)
      
      // Show success toast
      toast.success("Email sent successfully!", {
        description: "Please check your inbox for the confirmation link",
        duration: 5000,
      })
      
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (error: any) {
      console.error('Failed to resend confirmation email:', error)
      
      // Show error toast with appropriate message
      if (error.message?.includes('rate')) {
        toast.error("Too many attempts", {
          description: "Please wait a few minutes before trying again",
          duration: 5000,
        })
      } else {
        toast.error("Failed to send email", {
          description: error.message || "Please try again later",
          duration: 5000,
        })
      }
    } finally {
      setResendingEmail(false)
    }
  }

  // Email confirmation dialog
  if (showEmailConfirmation && generatedUsername) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Check Your Email!</CardTitle>
          <CardDescription>
            We've sent a confirmation email to <strong>{formData.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Important: Save your username!</strong>
              <div className="mt-2 p-2 bg-white rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <code className="font-mono text-lg">{generatedUsername}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyUsername}
                    className="ml-2"
                  >
                    {usernameCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm mt-2">Save this Customer ID for your records (you'll sign in with your email)</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please click the link in your email to confirm your account. 
              Once confirmed, you can sign in with your email and password.
            </p>
            
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Didn't receive the email?
              </p>
              <Button
                onClick={resendConfirmationEmail}
                disabled={resendingEmail}
                variant="outline"
                className="w-full"
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Email Sent!
                  </>
                ) : (
                  "Resend Confirmation Email"
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-4 text-center">
              <Button
                onClick={() => router.push("/auth/signin")}
                variant="link"
                className="text-sm"
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Username dialog (backup for when email confirmation is disabled)
  if (showUsernameDialog && generatedUsername) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Account Created Successfully!</CardTitle>
          <CardDescription>
            Save your username below. You'll need it to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              This is the ONLY time you'll see your username. Save it securely!
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label>Your Username</Label>
            <div className="flex gap-2">
              <Input
                value={generatedUsername}
                readOnly
                className="font-mono text-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyUsername}
              >
                {usernameCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Write this down or save it in a secure password manager
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Sign In Credentials:</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Username:</span> {generatedUsername}</p>
              <p><span className="text-muted-foreground">Password:</span> The password you just created</p>
            </div>
          </div>

          <Button onClick={proceedAfterUsername} className="w-full">
            I've Saved My Username - Continue
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create {role === "borrower" ? "Borrower" : "Lender"} Account</CardTitle>
        <CardDescription>
          Secure registration with identity verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  Full Name (as on ID/Passport)
                </Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Identity Verification */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Identity Verification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleChange("country", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idType">ID Type</Label>
                <Select
                  value={formData.idType}
                  onValueChange={(value) => handleChange("idType", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">
                  {formData.idType === "national_id" ? "ID Number" : "Passport Number"}
                </Label>
                <div className="relative">
                  <Input
                    id="idNumber"
                    placeholder={formData.idType === "national_id" ? "12345678" : "A1234567"}
                    value={formData.idNumber}
                    onChange={(e) => handleChange("idNumber", e.target.value)}
                    className={idValid === false ? "border-red-500" : idValid === true ? "border-green-500" : ""}
                    required
                  />
                  {idValid !== null && (
                    <div className="absolute right-2 top-2">
                      {idValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {idValid === false && (
                  <p className="text-xs text-red-500">Invalid {formData.idType === "national_id" ? "ID" : "passport"} format</p>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Security</h3>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
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
              
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? "bg-red-500"
                              : passwordStrength.score <= 3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => handleChange("acceptTerms", e.target.checked)}
              className="mt-1"
              required
            />
            <Label htmlFor="terms" className="text-sm">
              I agree to the Terms of Service and Privacy Policy. I understand that providing false information may result in account termination.
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !formData.acceptTerms}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}