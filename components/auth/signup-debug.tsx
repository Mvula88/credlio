'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createSupabaseClient } from '@/lib/supabase/client'

export function SignupDebug() {
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const runDiagnostics = async () => {
    setIsLoading(true)
    const logs: string[] = []
    
    try {
      // 1. Check Supabase connection
      logs.push('🔍 Checking Supabase connection...')
      const supabase = createSupabaseClient()
      
      // 2. Test auth endpoint
      logs.push('🔍 Testing auth endpoint...')
      const { data: session } = await supabase.auth.getSession()
      logs.push(session ? '✅ Session exists' : '✅ No active session (expected)')
      
      // 3. Check countries table
      logs.push('🔍 Checking countries table...')
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select('code, name')
        .limit(5)
      
      if (countriesError) {
        logs.push(`❌ Countries table error: ${countriesError.message}`)
      } else {
        logs.push(`✅ Countries found: ${countries?.length || 0}`)
        if (countries && countries.length > 0) {
          logs.push(`   Available: ${countries.map(c => c.name).join(', ')}`)
        }
      }
      
      // 4. Test signup with dummy data
      logs.push('🔍 Testing signup flow (dummy data)...')
      const testEmail = `test${Date.now()}@example.com`
      const { error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
      })
      
      if (signupError) {
        logs.push(`❌ Signup test failed: ${signupError.message}`)
        if (signupError.message.includes('email')) {
          logs.push('   💡 Email confirmation might be required')
          logs.push('   💡 Go to Supabase Dashboard > Authentication > Providers > Email')
          logs.push('   💡 Disable "Confirm email" for testing')
        }
      } else {
        logs.push('✅ Auth signup successful')
        
        // Clean up test user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(testEmail)
        if (!deleteError) {
          logs.push('✅ Test user cleaned up')
        }
      }
      
      // 5. Check browser cookies
      logs.push('🔍 Checking browser cookies...')
      const cookies = document.cookie.split('; ')
      const authCookies = cookies.filter(c => c.includes('supabase') || c.includes('auth'))
      logs.push(`   Found ${authCookies.length} auth-related cookies`)
      
      // 6. Clear corrupted cookies
      logs.push('🔍 Clearing any corrupted cookies...')
      let clearedCount = 0
      for (const cookie of cookies) {
        const [name, value] = cookie.split('=')
        if (value?.startsWith('base64-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          clearedCount++
        }
      }
      logs.push(clearedCount > 0 ? `   ✅ Cleared ${clearedCount} corrupted cookies` : '   ✅ No corrupted cookies found')
      
      // 7. Environment check
      logs.push('🔍 Checking environment variables...')
      logs.push(process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SUPABASE_URL is set' : '❌ SUPABASE_URL is missing')
      logs.push(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SUPABASE_ANON_KEY is set' : '❌ SUPABASE_ANON_KEY is missing')
      
    } catch (error) {
      logs.push(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    setDebugInfo(logs)
    setIsLoading(false)
  }

  const clearAllCookies = async () => {
    setIsLoading(true)
    
    // Clear client-side cookies
    const cookies = document.cookie.split('; ')
    let cleared = 0
    for (const cookie of cookies) {
      const [name] = cookie.split('=')
      if (name && (name.includes('supabase') || name.includes('auth'))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        cleared++
      }
    }
    
    // Call API to clear server-side cookies
    try {
      const response = await fetch('/api/clear-cookies')
      const data = await response.json()
      
      setDebugInfo([
        `✅ Cleared ${cleared} client-side cookies`,
        `✅ Server response: ${data.message}`,
        '🔄 Please refresh the page and try signing up again'
      ])
    } catch (error) {
      setDebugInfo([
        `✅ Cleared ${cleared} client-side cookies`,
        '❌ Failed to clear server cookies',
        '🔄 Please refresh the page and try signing up again'
      ])
    }
    
    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Signup Diagnostics</CardTitle>
        <CardDescription>
          Debug tool to identify and fix signup issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button 
            onClick={clearAllCookies} 
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            Clear All Cookies
          </Button>
        </div>
        
        {debugInfo.length > 0 && (
          <Alert>
            <AlertDescription>
              <div className="font-mono text-sm space-y-1">
                {debugInfo.map((log, i) => (
                  <div key={i} className={
                    log.startsWith('❌') ? 'text-red-600' :
                    log.startsWith('✅') ? 'text-green-600' :
                    log.startsWith('💡') ? 'text-yellow-600' :
                    ''
                  }>
                    {log}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Alert>
          <AlertDescription>
            <strong>Quick Fix Steps:</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>Run the SQL script: <code>FIX_USER_SIGNUP_COMPLETE.sql</code></li>
              <li>Go to Supabase Dashboard → Authentication → Providers → Email</li>
              <li>Disable "Confirm email" for testing</li>
              <li>Click "Clear All Cookies" button above</li>
              <li>Refresh the page and try signing up again</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}