"use client"

import { useEffect, useState } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function SupabaseDebug() {
  const [status, setStatus] = useState<{
    connection: "checking" | "success" | "error"
    error?: string
  }>({
    connection: "checking",
  })

  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const supabase = createSupabaseClient()
        const { data, error } = await supabase.from("profiles").select("count").limit(1)

        if (error) {
          setStatus({
            connection: "error",
            error: error.message,
          })
        } else {
          setStatus({
            connection: "success",
          })
        }
      } catch (err) {
        setStatus({
          connection: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    checkSupabase()
  }, [])

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">🔧 Development Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">Supabase Connection:</span>
          <Badge
            variant={
              status.connection === "success" ? "default" : status.connection === "error" ? "destructive" : "secondary"
            }
          >
            {status.connection === "checking" && "⏳ Checking..."}
            {status.connection === "success" && "✓ Connected"}
            {status.connection === "error" && "✗ Failed"}
          </Badge>
        </div>
        {status.error && <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">Error: {status.error}</div>}
      </CardContent>
    </Card>
  )
}
