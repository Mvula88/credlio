"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthDebugPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleDebugAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <Button onClick={handleDebugAuth} disabled={loading}>
            {loading ? "Testing..." : "Test Authentication"}
          </Button>

          {result && (
            <Alert>
              <AlertDescription>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold">What this checks:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Whether the email/password combination is correct</li>
              <li>If the email is confirmed</li>
              <li>If a profile exists for this user</li>
              <li>Any specific error messages from Supabase</li>
              <li>The user's confirmation status</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}