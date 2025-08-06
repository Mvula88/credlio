import { createBrowserClient } from "@supabase/ssr"

export const createSupabaseClient = () => {
  // Clear any corrupted cookies on the client side
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split('; ')
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name && (name.includes('supabase') || name.includes('auth'))) {
        if (value && value.startsWith('base64-')) {
          // Clear corrupted cookie
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          console.warn(`Cleared corrupted cookie: ${name}`)
        }
      }
    }
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof window === 'undefined') return ''
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
          
          // Skip corrupted cookies
          if (value?.startsWith('base64-')) {
            console.warn(`Skipping corrupted cookie: ${name}`)
            return ''
          }
          return value || ''
        },
        set(name: string, value: string, options?: any) {
          if (typeof window === 'undefined') return
          // Don't set corrupted cookies
          if (value?.startsWith('base64-')) {
            console.warn(`Preventing corrupted cookie set: ${name}`)
            return
          }
          document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ''}`
        },
        remove(name: string) {
          if (typeof window === 'undefined') return
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        },
      },
    }
  )
}
