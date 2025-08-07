import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"

// SQL for creating loan_agreements table
const CREATE_LOAN_AGREEMENTS_SQL = `
-- Create loan agreements table
CREATE TABLE IF NOT EXISTS public.loan_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Related entities
    loan_request_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE,
    lender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Loan terms
    loan_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    loan_term INTEGER NOT NULL,
    repayment_frequency VARCHAR(20) NOT NULL,
    
    -- Additional terms
    collateral_description TEXT,
    additional_terms TEXT,
    late_payment_penalty DECIMAL(5,2) DEFAULT 5.0,
    default_grace_period INTEGER DEFAULT 7,
    
    -- Agreement status and tracking
    agreement_status VARCHAR(20) DEFAULT 'generated',
    agreement_number VARCHAR(50) UNIQUE,
    
    -- File storage
    agreement_file_path TEXT,
    agreement_file_hash VARCHAR(64),
    
    -- Borrower signature tracking
    borrower_signed BOOLEAN DEFAULT FALSE,
    borrower_signature_date TIMESTAMP WITH TIME ZONE,
    borrower_signature_ip VARCHAR(45),
    borrower_full_name VARCHAR(255),
    borrower_id_number VARCHAR(50),
    borrower_phone_number VARCHAR(20),
    
    -- Digital signature verification
    signature_hash VARCHAR(128),
    signature_verified BOOLEAN DEFAULT FALSE,
    
    -- Legal and compliance
    terms_version VARCHAR(10) DEFAULT '1.0',
    governing_law VARCHAR(100),
    dispute_resolution_method VARCHAR(50) DEFAULT 'court_arbitration',
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_to_borrower_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_agreement_status CHECK (agreement_status IN ('generated', 'sent', 'signed', 'active', 'completed', 'defaulted', 'cancelled')),
    CONSTRAINT valid_repayment_frequency CHECK (repayment_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly')),
    CONSTRAINT positive_loan_amount CHECK (loan_amount > 0),
    CONSTRAINT valid_interest_rate CHECK (interest_rate >= 0 AND interest_rate <= 100),
    CONSTRAINT valid_loan_term CHECK (loan_term > 0)
);
`

const CREATE_INDEXES_SQL = `
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loan_agreements_loan_request ON public.loan_agreements(loan_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_lender ON public.loan_agreements(lender_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_borrower ON public.loan_agreements(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_status ON public.loan_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_number ON public.loan_agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_loan_agreements_generated_at ON public.loan_agreements(generated_at);
`

const CREATE_RLS_POLICIES_SQL = `
-- Enable RLS
ALTER TABLE public.loan_agreements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "lenders_manage_own_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "borrowers_view_own_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "borrowers_sign_agreements" ON public.loan_agreements;
DROP POLICY IF EXISTS "admins_view_all_agreements" ON public.loan_agreements;

-- Policy: Lenders can manage their own agreements
CREATE POLICY "lenders_manage_own_agreements" ON public.loan_agreements
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = lender_id
        )
    );

-- Policy: Borrowers can view their own agreements
CREATE POLICY "borrowers_view_own_agreements" ON public.loan_agreements
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

-- Policy: Borrowers can update signature fields only
CREATE POLICY "borrowers_sign_agreements" ON public.loan_agreements
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.profiles WHERE id = borrower_id
        )
    );

-- Policy: Admins can view all agreements
CREATE POLICY "admins_view_all_agreements" ON public.loan_agreements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );
`

const CREATE_AUDIT_LOG_SQL = `
-- Create agreement audit log table
CREATE TABLE IF NOT EXISTS public.agreement_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Related agreement
    agreement_id UUID REFERENCES public.loan_agreements(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- User who performed the action
    user_id UUID REFERENCES public.profiles(id),
    user_role VARCHAR(20) NOT NULL,
    
    -- Technical details
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Signature-specific data
    signature_hash VARCHAR(128),
    borrower_info JSONB,
    
    -- Additional metadata
    metadata JSONB,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'generated', 'sent', 'viewed', 'signed', 'activated', 
        'modified', 'cancelled', 'defaulted', 'completed'
    )),
    CONSTRAINT valid_user_role CHECK (user_role IN ('lender', 'borrower', 'admin', 'super_admin', 'country_admin'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agreement_audit_agreement ON public.agreement_audit_log(agreement_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_user ON public.agreement_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_action ON public.agreement_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agreement_audit_timestamp ON public.agreement_audit_log(timestamp);

-- Enable RLS
ALTER TABLE public.agreement_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_own_agreement_logs" ON public.agreement_audit_log;
DROP POLICY IF EXISTS "admins_view_all_logs" ON public.agreement_audit_log;
DROP POLICY IF EXISTS "system_insert_logs" ON public.agreement_audit_log;

-- Create policies
CREATE POLICY "users_view_own_agreement_logs" ON public.agreement_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.loan_agreements la
            WHERE la.id = agreement_id
            AND (
                la.lender_id IN (
                    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
                )
                OR la.borrower_id IN (
                    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "admins_view_all_logs" ON public.agreement_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'country_admin')
        )
    );

CREATE POLICY "system_insert_logs" ON public.agreement_audit_log
    FOR INSERT WITH CHECK (true);
`

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", session.user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const results = []

    // Create loan_agreements table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql_query: CREATE_LOAN_AGREEMENTS_SQL
    })
    
    if (tableError && !tableError.message.includes('already exists')) {
      results.push({ step: 'create_table', error: tableError.message })
    } else {
      results.push({ step: 'create_table', success: true })
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: CREATE_INDEXES_SQL
    })
    
    if (indexError) {
      results.push({ step: 'create_indexes', error: indexError.message })
    } else {
      results.push({ step: 'create_indexes', success: true })
    }

    // Create RLS policies
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: CREATE_RLS_POLICIES_SQL
    })
    
    if (rlsError) {
      results.push({ step: 'create_rls_policies', error: rlsError.message })
    } else {
      results.push({ step: 'create_rls_policies', success: true })
    }

    // Create audit log table
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql_query: CREATE_AUDIT_LOG_SQL
    })
    
    if (auditError && !auditError.message.includes('already exists')) {
      results.push({ step: 'create_audit_log', error: auditError.message })
    } else {
      results.push({ step: 'create_audit_log', success: true })
    }

    // Grant permissions
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql_query: `
        GRANT ALL ON public.loan_agreements TO authenticated;
        GRANT SELECT, INSERT ON public.agreement_audit_log TO authenticated;
      `
    })
    
    if (grantError) {
      results.push({ step: 'grant_permissions', error: grantError.message })
    } else {
      results.push({ step: 'grant_permissions', success: true })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Loan agreements tables created successfully",
      results 
    })

  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json({ 
      error: "Failed to setup tables", 
      details: error.message 
    }, { status: 500 })
  }
}