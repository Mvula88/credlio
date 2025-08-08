"use client"

import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import type { Database } from "@/lib/types/database"

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleSignOut = async () => {
    try {
      // Call the signout API to clear server-side session
      await fetch('/api/auth/signout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear client-side auth
      await supabase.auth.signOut()
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear()
        // Clear sessionStorage  
        sessionStorage.clear()
      }
      
      // Force hard navigation to clear all client-side state
      window.location.href = "/"
    } catch (error) {
      console.error('Sign out error:', error)
      // Fallback to hard redirect even if there's an error
      window.location.href = "/"
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  )
}
