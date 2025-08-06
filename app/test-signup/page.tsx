'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testBasicSignup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    const supabase = createSupabaseClient()
    
    try {
      console.log('Testing basic signup with:', email)
      
      // Step 1: Try basic auth signup
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (signupError) {
        console.error('Signup error:', signupError)
        setError(`Auth Error: ${signupError.message}`)
        setResult({
          step: 'auth.signUp',
          error: signupError,
          errorDetails: {
            message: signupError.message,
            status: signupError.status,
            code: signupError.code
          }
        })
        return
      }
      
      console.log('Signup successful:', data)
      
      // Step 2: Check if user was created
      if (!data.user) {
        setError('No user returned from signup')
        setResult({
          step: 'auth.signUp',
          data: data,
          warning: 'No user object returned'
        })
        return
      }
      
      // Step 3: Check if confirmation is needed
      const needsConfirmation = !data.session
      
      setResult({
        success: true,
        userId: data.user.id,
        email: data.user.email,
        needsEmailConfirmation: needsConfirmation,
        session: data.session ? 'Session created' : 'No session (email confirmation required)',
        user: {
          id: data.user.id,
          email: data.user.email,
          confirmed_at: data.user.confirmed_at,
          email_confirmed_at: data.user.email_confirmed_at
        }
      })
      
      if (needsConfirmation) {
        setError('Success! Check your email for confirmation link.')
      } else {
        setError('Success! User created and logged in.')
      }
      
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err.message}`)
      setResult({
        step: 'catch',
        error: err.message,
        stack: err.stack
      })
    } finally {
      setLoading(false)
    }
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    const supabase = createSupabaseClient()
    
    try {
      // Test 1: Can we query countries?
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select('code, name')
        .limit(3)
      
      if (countriesError) {
        setError(`Database Error: ${countriesError.message}`)
        setResult({
          step: 'countries query',
          error: countriesError
        })
        return
      }
      
      // Test 2: Check auth settings
      const { data: session } = await supabase.auth.getSession()
      
      setResult({
        database: 'Connected',
        countries: countries,
        countriesCount: countries?.length || 0,
        currentSession: session?.session ? 'Active session' : 'No session',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      })
      
      setError(null)
      
    } catch (err: any) {
      setError(`Error: ${err.message}`)
      setResult({
        step: 'catch',
        error: err
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Signup Flow</CardTitle>
          <CardDescription>
            Debug tool to test basic Supabase auth signup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Database Connection */}
          <div className="space-y-2">
            <Button 
              onClick={testDatabaseConnection}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Test Database Connection
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Test Basic Signup</h3>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button 
                onClick={testBasicSignup}
                disabled={loading || !email || !password}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Signup'}
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant={error.includes('Success') ? 'default' : 'destructive'}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Result:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <Alert>
            <AlertDescription>
              <strong>Troubleshooting Steps:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>First click "Test Database Connection" to verify Supabase is reachable</li>
                <li>Enter a test email and password (min 6 chars)</li>
                <li>Click "Test Signup" and check the result</li>
                <li>Look for error details in the result box</li>
                <li>Check browser console (F12) for additional logs</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}