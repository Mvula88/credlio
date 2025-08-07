export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get borrower statistics
    const { data: borrowerStats, error: statsError } = await supabase
      .rpc('get_borrower_statistics')
      
    if (statsError) {
      console.error('Error fetching borrower statistics:', statsError)
      // Fallback to manual calculation
      const { data: borrowers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'borrower')
      
      const { data: loans } = await supabase
        .from('loans')
        .select('amount, status')
      
      const totalLoans = loans?.length || 0
      const approvedLoans = loans?.filter(l => 
        l.status === 'active' || l.status === 'completed'
      ).length || 0
      const totalAmount = loans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0
      
      return NextResponse.json({
        total_borrowers: borrowers?.length || 0,
        total_loans: totalLoans,
        total_loan_amount: totalAmount,
        approval_rate: totalLoans > 0 
          ? Math.round((approvedLoans / totalLoans) * 100) 
          : 0,
        average_rating: 4.8 // This could be calculated from actual ratings
      })
    }
    
    // Return the statistics
    return NextResponse.json({
      total_borrowers: borrowerStats?.total_borrowers || 0,
      total_loans: borrowerStats?.total_loans || 0,
      total_loan_amount: borrowerStats?.total_loan_amount || 0,
      approval_rate: borrowerStats?.approval_rate || 0,
      average_rating: 4.8 // This could be calculated from actual ratings
    })
    
  } catch (error) {
    console.error('Error in borrower stats API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch borrower statistics' },
      { status: 500 }
    )
  }
}