'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SecureAdminPortal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendButton, setShowResendButton] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Verify admin key first (this should match an environment variable)
      const validAdminKey = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || 'CREDLIO-ADMIN-2024'
      
      if (adminKey !== validAdminKey) {
        setError('Invalid admin access key')
        setIsLoading(false)
        
        // Log failed attempt
        await fetch('/api/admin/security/log-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            reason: 'Invalid admin key',
            ip: window.location.hostname
          })
        })
        
        return
      }

      // Attempt login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        setError('Invalid credentials')
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setError('Email not verified. Please check your email for the verification link.')
          setShowResendButton(true)
          setIsLoading(false)
          return
        }
        
        // Check if user has admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single()

        if (!profile || !['admin', 'super_admin', 'country_admin'].includes(profile.role)) {
          // Not an admin - sign out and show error
          await supabase.auth.signOut()
          setError('Access denied. Admin privileges required.')
          
          // Log unauthorized attempt
          await fetch('/api/admin/security/log-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              reason: 'Non-admin user',
              ip: window.location.hostname
            })
          })
          
          setIsLoading(false)
          return
        }

        // Admin verified - set session and redirect
        sessionStorage.setItem('admin_verified', 'true')
        sessionStorage.setItem('admin_verified_at', new Date().toISOString())
        
        // Log successful access
        await fetch('/api/admin/security/log-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            reason: 'Success',
            ip: window.location.hostname
          })
        })
        
        toast.success('Admin access granted')
        
        // Redirect to appropriate admin dashboard
        if (profile.role === 'super_admin') {
          router.push('/super-admin/dashboard')
        } else if (profile.role === 'country_admin') {
          router.push('/admin/country/dashboard')
        } else {
          router.push('/admin/dashboard')
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Admin login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) {
        toast.error('Failed to resend verification email')
      } else {
        toast.success('Verification email sent! Please check your inbox.')
        setShowResendButton(false)
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Admin Portal</CardTitle>
          <CardDescription className="text-center">
            Restricted Access - Authorized Personnel Only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminKey">Admin Access Key</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminKey"
                  type="password"
                  placeholder="Enter admin key"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@credlio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Access Admin Portal'}
            </Button>

            {showResendButton && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                Resend Verification Email
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>All access attempts are logged and monitored</p>
              <p className="mt-1">Admin accounts require email verification</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}