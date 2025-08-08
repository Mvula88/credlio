import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Sign out from Supabase
  await supabase.auth.signOut()
  
  // Clear all cookies
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  
  const response = NextResponse.json({ success: true })
  
  // Delete all cookies
  allCookies.forEach((cookie) => {
    response.cookies.delete(cookie.name)
  })
  
  return response
}