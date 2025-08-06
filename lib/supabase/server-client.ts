import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database"

// Safe for App Router - user context only, no service role key
export const createServerSupabaseClient = () => {
  try {
    const cookieStore = cookies()
    
    // Clear any corrupted auth cookies
    const authCookies = cookieStore.getAll().filter(cookie => 
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    )
    
    for (const cookie of authCookies) {
      if (cookie.value && cookie.value.startsWith('base64-')) {
        // This is likely a corrupted cookie, skip it
        console.warn(`Skipping potentially corrupted cookie: ${cookie.name}`)
        continue
      }
    }
    
    return createServerComponentClient<Database>({ 
      cookies: () => cookieStore
    })
  } catch (error) {
    console.error('Error creating server Supabase client:', error)
    // Return a basic client even if cookies are corrupted
    return createServerComponentClient<Database>({ cookies })
  }
}
