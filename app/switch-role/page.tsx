'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function SwitchRolePage() {
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchCurrentRole()
  }, [])

  const fetchCurrentRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      setEmail(user.email || null)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      
      if (profile) {
        setCurrentRole(profile.role)
        setSelectedRole(profile.role)
      }
    }
  }

  const handleRoleSwitch = async () => {
    if (!email || !selectedRole) return
    
    setLoading(true)
    
    try {
      // Call the switch_user_role function
      const { data, error } = await supabase.rpc('switch_user_role', {
        p_email: email,
        p_new_role: selectedRole
      })
      
      if (error) throw error
      
      if (data?.success) {
        // Clear any cached data
        await supabase.auth.refreshSession()
        
        // Redirect based on new role
        switch (selectedRole) {
          case 'borrower':
            router.push('/borrower/dashboard')
            break
          case 'lender':
            router.push('/lender/dashboard')
            break
          case 'admin':
          case 'super_admin':
            router.push('/super-admin/dashboard')
            break
          default:
            router.push('/dashboard')
        }
      } else {
        alert(data?.error || 'Failed to switch role')
      }
    } catch (error: any) {
      console.error('Error switching role:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Switch User Role (Testing)</CardTitle>
          <CardDescription>
            Change your account role for testing different parts of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Current User:</strong> {email}<br />
              <strong>Current Role:</strong> {currentRole || 'Loading...'}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Select New Role:</Label>
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="borrower" id="borrower" />
                <Label htmlFor="borrower">
                  Borrower - Can request loans
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lender" id="lender" />
                <Label htmlFor="lender">
                  Lender - Can offer loans
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin">
                  Admin - Full admin access
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleRoleSwitch}
              disabled={loading || selectedRole === currentRole}
              className="flex-1"
            >
              {loading ? 'Switching...' : 'Switch Role'}
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Alternative: Use Email Aliases</strong><br />
              <p className="mt-2">
                Instead of switching roles, you can create separate test accounts using Gmail aliases:
              </p>
              <ul className="mt-2 ml-4 list-disc">
                <li>{email?.split('@')[0]}+borrower@gmail.com</li>
                <li>{email?.split('@')[0]}+lender@gmail.com</li>
                <li>{email?.split('@')[0]}+test@gmail.com</li>
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                These all go to your same Gmail inbox but are treated as different accounts.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}