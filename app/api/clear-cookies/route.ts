export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    
    let clearedCount = 0
    const clearedCookies: string[] = []
    
    // Clear all Supabase-related cookies
    for (const cookie of allCookies) {
      if (cookie.name.includes('supabase') || 
          cookie.name.includes('auth') || 
          cookie.name.includes('sb-')) {
        
        // Clear the cookie
        cookieStore.delete(cookie.name)
        clearedCount++
        clearedCookies.push(cookie.name)
      }
    }
    
    // Set proper response headers to clear cookies on client side too
    const response = NextResponse.json({ 
      success: true, 
      message: `Cleared ${clearedCount} cookies`,
      clearedCookies 
    })
    
    // Clear each cookie explicitly in the response
    for (const cookieName of clearedCookies) {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
    }
    
    return response
  } catch (error) {
    console.error('Error clearing cookies:', error)
    return NextResponse.json(
      { error: 'Failed to clear cookies' },
      { status: 500 }
    )
  }
}