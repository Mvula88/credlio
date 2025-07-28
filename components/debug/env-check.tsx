"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

export function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: boolean
    supabaseKey: boolean
  } | null>(null)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== "development") return

    setEnvStatus({
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }, [])

  // Don't render in production
  if (process.env.NODE_ENV !== "development" || !envStatus) return null

  const allGood = envStatus.supabaseUrl && envStatus.supabaseKey

  return (
    <Alert variant={allGood ? "default" : "destructive"} className="mb-4">
      <div className="flex items-center gap-2">
        {allGood ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
        <AlertDescription>
          <strong>Environment Check:</strong>
          <ul className="mt-1 text-sm">
            <li>Supabase URL: {envStatus.supabaseUrl ? "✅" : "❌"}</li>
            <li>Supabase Key: {envStatus.supabaseKey ? "✅" : "❌"}</li>
          </ul>
        </AlertDescription>
      </div>
    </Alert>
  )
}
