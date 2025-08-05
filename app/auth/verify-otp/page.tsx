"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState("")

  useEffect(() => {
    const verifyOTP = async () => {
      try {
        // Get the token from URL parameters
        const token = searchParams.get('token')
        const type = searchParams.get('type') || 'email'
        const email = searchParams.get('email')
        
        if (!token) {
          setStatus('error')
          setMessage('Invalid verification link. Please request a new one.')
          return
        }

        // Verify the OTP token
        const { data, error } = await supabase.auth.verifyOtp({
          email: email || '',
          token: token,
          type: type as any
        })

        if (error) {
          setStatus('error')
          setMessage('Verification failed. The link may have expired.')
          return
        }

        // Success - get user profile
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("id, role, country")
          .eq("auth_user_id", data.user?.id)
          .single()

        setStatus('success')
        setMessage('Email verified successfully! Redirecting...')

        // Redirect based on role after a short delay
        setTimeout(() => {
          if (!userProfile?.country) {
            router.push("/auth/select-country")
          } else {
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
          }
        }, 2000)

      } catch (error: any) {
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
        console.error('OTP verification error:', error)
      }
    }

    verifyOTP()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4">
            {status === 'loading' && (
              <div className="bg-blue-100">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && 'Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email'}
            {status === 'success' && 'Your email has been successfully verified'}
            {status === 'error' && 'We could not verify your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={status === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <div className="mt-4 text-center">
              <a href="/auth/signin" className="text-sm text-primary hover:underline">
                Return to sign in
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}