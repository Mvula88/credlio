"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"

export default function TestAuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch("/api/test-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      setResult(data)
      console.log("Auth test result:", data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
    
    setLoading(false)
  }

  const handleTestSupabase = async () => {
    // Test direct Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    setResult({
      supabaseUrl: supabaseUrl ? "✅ Found" : "❌ Missing",
      supabaseKey: supabaseKey ? "✅ Found" : "❌ Missing",
    })
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={loading || !email || !password}>
              {loading ? "Testing..." : "Test Sign In"}
            </Button>
            <Button onClick={handleTestSupabase} variant="outline">
              Check Environment
            </Button>
          </div>

          {result && (
            <div className="space-y-4">
              {result.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Sign In Test */}
                  {result.tests?.signIn && (
                    <Alert variant={result.tests.signIn.success ? "default" : "destructive"}>
                      <div className="flex items-start gap-2">
                        {result.tests.signIn.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <AlertTitle>Sign In Test</AlertTitle>
                          <AlertDescription>
                            {result.tests.signIn.success ? (
                              <div>
                                <p>✅ Sign in successful!</p>
                                <p className="text-xs mt-1">User ID: {result.tests.signIn.user?.id}</p>
                                <p className="text-xs">Email confirmed: {result.tests.signIn.user?.emailConfirmed || "Not confirmed"}</p>
                              </div>
                            ) : (
                              <div>
                                <p>❌ Sign in failed</p>
                                <p className="text-xs mt-1">Error: {result.tests.signIn.error}</p>
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Profile Test */}
                  {result.tests?.profile && (
                    <Alert>
                      <AlertTitle>Profile Check</AlertTitle>
                      <AlertDescription>
                        {result.tests.profile.exists ? (
                          <div>
                            <p>✅ Profile exists</p>
                            <p className="text-xs mt-1">Role: {result.tests.profile.data?.role}</p>
                            <p className="text-xs">Country ID: {result.tests.profile.data?.country_id}</p>
                          </div>
                        ) : (
                          <p>❌ No profile found for this email</p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Raw JSON */}
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium">View Raw Response</summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Common Issues</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p className="text-sm">• <strong>Email not confirmed:</strong> Check your email for confirmation link</p>
              <p className="text-sm">• <strong>Wrong password:</strong> Password is case-sensitive</p>
              <p className="text-sm">• <strong>No profile:</strong> User exists in auth but profile wasn't created</p>
              <p className="text-sm">• <strong>Email typo:</strong> Check for spaces or typos in email</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}