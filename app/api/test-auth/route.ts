import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()
    
    // Create a fresh Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // If username is provided, look up the email
    let authEmail = email
    if (username && !email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username)
        .single()
      
      if (!profile) {
        return NextResponse.json({
          error: `Username '${username}' not found`,
          username,
          tests: {
            signIn: {
              success: false,
              error: `Username '${username}' not found in profiles table`
            }
          }
        })
      }
      authEmail = profile.email
      console.log("Found email for username:", { username, email: authEmail })
    }
    
    console.log("Testing auth with:", { email: authEmail, username, passwordLength: password?.length })
    
    // Test 1: Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
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
      .eq("email", authEmail)
      .single()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      email: authEmail,
      username: username || null,
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