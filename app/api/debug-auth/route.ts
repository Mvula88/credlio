import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    const supabase = createServerSupabaseClient()

    // First, try to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Get more details about the user
    let userDetails = null
    let profileDetails = null
    
    if (email) {
      // Check if user exists in auth.users (requires service role)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single()
      
      profileDetails = profile
    }

    // Try to get current session
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      success: !authError,
      authError: authError ? {
        message: authError.message,
        status: authError.status,
        code: authError.code,
      } : null,
      authUser: authData?.user ? {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmedAt: authData.user.email_confirmed_at,
        confirmedAt: authData.user.confirmed_at,
        lastSignInAt: authData.user.last_sign_in_at,
        createdAt: authData.user.created_at,
      } : null,
      profile: profileDetails,
      hasSession: !!session,
      sessionUser: session?.user?.email,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    })
  }
}