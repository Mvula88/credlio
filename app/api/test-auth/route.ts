import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // Create a fresh Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log("Testing auth with:", { email, passwordLength: password?.length })
    
    // Test 1: Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Test 2: Check if user exists
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    // Test 3: Try to get user by email (different method)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    // Test 4: Check profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      email,
      tests: {
        signIn: {
          success: !signInError,
          error: signInError?.message,
          user: signInData?.user ? {
            id: signInData.user.id,
            email: signInData.user.email,
            emailConfirmed: signInData.user.email_confirmed_at,
            created: signInData.user.created_at,
          } : null,
        },
        profile: {
          exists: !!profileData,
          data: profileData,
          error: profileError?.message,
        },
        session: {
          exists: !!signInData?.session,
          expiresAt: signInData?.session?.expires_at,
        }
      },
      environment: {
        supabaseUrl: supabaseUrl?.substring(0, 30) + "...",
        hasAnonKey: !!supabaseAnonKey,
      }
    })
  } catch (error: any) {
    console.error("Test auth error:", error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}