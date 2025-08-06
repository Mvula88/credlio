import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server-client'

export async function POST(request: Request) {
  try {
    const { email, reason, ip } = await request.json()
    const supabase = createServerSupabaseClient()

    // Try to log the attempt, but don't fail if table doesn't exist
    try {
      await supabase.from('admin_access_logs').insert({
        email,
        access_type: 'portal_login',
        success: reason === 'Success',
        failure_reason: reason !== 'Success' ? reason : null,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ip,
        user_agent: request.headers.get('user-agent')
      })
    } catch (dbError) {
      // Table might not exist yet, just log to console
      console.log('Admin access attempt:', { email, reason, ip })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log attempt error:', error)
    // Don't fail the login process just because logging failed
    return NextResponse.json({ success: true })
  }
}