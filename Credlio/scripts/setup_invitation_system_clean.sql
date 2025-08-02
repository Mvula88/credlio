-- Setup Invitation System for Borrower Landing Page (CLEAN VERSION)
-- This script safely creates or updates the invitation system

-- =====================================================
-- 1. DROP AND RECREATE POLICIES
-- =====================================================

-- Drop all existing policies first to avoid conflicts
DO $$ 
BEGIN
  -- Drop invitations policies
  DROP POLICY IF EXISTS "invitations_select_own" ON invitations;
  DROP POLICY IF EXISTS "invitations_select_by_code" ON invitations;
  DROP POLICY IF EXISTS "invitations_insert_lender" ON invitations;
  DROP POLICY IF EXISTS "invitations_update_acceptance" ON invitations;
  DROP POLICY IF EXISTS "Lenders can view their own invitations" ON invitations;
  DROP POLICY IF EXISTS "Lenders can create invitations" ON invitations;
  DROP POLICY IF EXISTS "Anyone can view invitation by code" ON invitations;
  DROP POLICY IF EXISTS "Invitations can be updated when accepted" ON invitations;
  
  -- Drop borrower_invites policies
  DROP POLICY IF EXISTS "borrower_invites_select_own" ON borrower_invites;
  DROP POLICY IF EXISTS "borrower_invites_select_by_code" ON borrower_invites;
  DROP POLICY IF EXISTS "borrower_invites_insert_lender" ON borrower_invites;
  DROP POLICY IF EXISTS "borrower_invites_update_acceptance" ON borrower_invites;
  DROP POLICY IF EXISTS "Lenders can view their own borrower invites" ON borrower_invites;
  DROP POLICY IF EXISTS "Lenders can create borrower invites" ON borrower_invites;
  DROP POLICY IF EXISTS "Borrower invites can be viewed by code" ON borrower_invites;
  
  -- Drop lender_borrower_relationships policies
  DROP POLICY IF EXISTS "relationships_select_own" ON lender_borrower_relationships;
  DROP POLICY IF EXISTS "relationships_insert_via_invitation" ON lender_borrower_relationships;
  DROP POLICY IF EXISTS "relationships_update_lender" ON lender_borrower_relationships;
  DROP POLICY IF EXISTS "Users can view their relationships" ON lender_borrower_relationships;
  DROP POLICY IF EXISTS "System can create relationships" ON lender_borrower_relationships;
  DROP POLICY IF EXISTS "Lenders can update their relationships" ON lender_borrower_relationships;
EXCEPTION
  WHEN undefined_table THEN
    -- Tables don't exist yet, that's fine
    NULL;
END $$;

-- =====================================================
-- 2. CREATE TABLES IF NOT EXISTS
-- =====================================================

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  lender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES countries(id),
  accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMPTZ,
  borrower_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create borrower_invites table
CREATE TABLE IF NOT EXISTS borrower_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_name VARCHAR(255) NOT NULL,
  borrower_phone VARCHAR(50) NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  whatsapp_link TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
  accepted_at TIMESTAMPTZ,
  borrower_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lender_borrower_relationships table
CREATE TABLE IF NOT EXISTS lender_borrower_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lender_id, borrower_id)
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_lender_id ON invitations(lender_id);
CREATE INDEX IF NOT EXISTS idx_invitations_borrower_id ON invitations(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_invites_invite_code ON borrower_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_borrower_invites_lender_id ON borrower_invites(lender_id);
CREATE INDEX IF NOT EXISTS idx_borrower_invites_status ON borrower_invites(status);
CREATE INDEX IF NOT EXISTS idx_lender_borrower_relationships_lender ON lender_borrower_relationships(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_borrower_relationships_borrower ON lender_borrower_relationships(borrower_id);

-- =====================================================
-- 4. ENABLE RLS
-- =====================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_borrower_relationships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE NEW POLICIES
-- =====================================================

-- INVITATIONS TABLE POLICIES
CREATE POLICY "invitations_select_own" ON invitations
  FOR SELECT 
  USING (
    auth.uid() = lender_id 
    OR auth.uid() = borrower_id
  );

CREATE POLICY "invitations_select_by_code" ON invitations
  FOR SELECT 
  USING (
    code IS NOT NULL 
    AND accepted = FALSE 
    AND expires_at > NOW()
  );

CREATE POLICY "invitations_insert_lender" ON invitations
  FOR INSERT 
  WITH CHECK (
    auth.uid() = lender_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'lender'
    )
  );

CREATE POLICY "invitations_update_acceptance" ON invitations
  FOR UPDATE 
  USING (
    accepted = FALSE 
    AND expires_at > NOW()
  )
  WITH CHECK (
    accepted = TRUE 
    AND accepted_at IS NOT NULL 
    AND borrower_id IS NOT NULL
  );

-- BORROWER_INVITES TABLE POLICIES
CREATE POLICY "borrower_invites_select_own" ON borrower_invites
  FOR SELECT 
  USING (
    auth.uid() = lender_id
    OR (auth.uid() = borrower_id AND borrower_id IS NOT NULL)
  );

CREATE POLICY "borrower_invites_select_by_code" ON borrower_invites
  FOR SELECT 
  USING (
    invite_code IS NOT NULL 
    AND status = 'pending' 
    AND expires_at > NOW()
  );

CREATE POLICY "borrower_invites_insert_lender" ON borrower_invites
  FOR INSERT 
  WITH CHECK (
    auth.uid() = lender_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'lender'
    )
    AND expires_at > NOW()
  );

CREATE POLICY "borrower_invites_update_acceptance" ON borrower_invites
  FOR UPDATE 
  USING (
    status = 'pending' 
    AND expires_at > NOW()
  )
  WITH CHECK (
    status IN ('accepted', 'expired')
  );

-- LENDER_BORROWER_RELATIONSHIPS TABLE POLICIES
CREATE POLICY "relationships_select_own" ON lender_borrower_relationships
  FOR SELECT 
  USING (
    auth.uid() = lender_id 
    OR auth.uid() = borrower_id
  );

CREATE POLICY "relationships_insert_via_invitation" ON lender_borrower_relationships
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invitations 
      WHERE lender_id = lender_borrower_relationships.lender_id
      AND borrower_id = lender_borrower_relationships.borrower_id
      AND accepted = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM borrower_invites 
      WHERE lender_id = lender_borrower_relationships.lender_id
      AND borrower_id = lender_borrower_relationships.borrower_id
      AND status = 'accepted'
    )
  );

CREATE POLICY "relationships_update_lender" ON lender_borrower_relationships
  FOR UPDATE 
  USING (auth.uid() = lender_id)
  WITH CHECK (status IN ('active', 'inactive', 'blocked'));

-- =====================================================
-- 6. CREATE OR REPLACE FUNCTIONS
-- =====================================================

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars))::INT + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Secure function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_code TEXT,
  p_borrower_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_borrower_invite RECORD;
BEGIN
  -- Check invitations table
  SELECT * INTO v_invitation
  FROM invitations
  WHERE code = p_invitation_code
    AND accepted = FALSE
    AND expires_at > NOW();
    
  IF FOUND THEN
    -- Update invitation
    UPDATE invitations
    SET 
      accepted = TRUE,
      accepted_at = NOW(),
      borrower_id = p_borrower_id
    WHERE id = v_invitation.id;
    
    -- Create relationship
    INSERT INTO lender_borrower_relationships (lender_id, borrower_id, status)
    VALUES (v_invitation.lender_id, p_borrower_id, 'active')
    ON CONFLICT (lender_id, borrower_id) DO NOTHING;
    
    RETURN TRUE;
  END IF;
  
  -- Check borrower_invites table
  SELECT * INTO v_borrower_invite
  FROM borrower_invites
  WHERE invite_code = p_invitation_code
    AND status = 'pending'
    AND expires_at > NOW();
    
  IF FOUND THEN
    -- Update borrower invite
    UPDATE borrower_invites
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      borrower_id = p_borrower_id
    WHERE id = v_borrower_invite.id;
    
    -- Update corresponding invitation if exists
    UPDATE invitations
    SET 
      accepted = TRUE,
      accepted_at = NOW(),
      borrower_id = p_borrower_id
    WHERE code = p_invitation_code;
    
    -- Create relationship
    INSERT INTO lender_borrower_relationships (lender_id, borrower_id, status)
    VALUES (v_borrower_invite.lender_id, p_borrower_id, 'active')
    ON CONFLICT (lender_id, borrower_id) DO NOTHING;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get borrower statistics
CREATE OR REPLACE FUNCTION get_borrower_statistics()
RETURNS TABLE (
  total_borrowers BIGINT,
  total_loans BIGINT,
  total_loan_amount NUMERIC,
  approval_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'borrower'),
    COUNT(DISTINCT l.id),
    COALESCE(SUM(l.amount), 0),
    CASE 
      WHEN COUNT(l.id) > 0 THEN 
        (COUNT(l.id) FILTER (WHERE l.status IN ('active', 'completed'))::NUMERIC / COUNT(l.id)::NUMERIC * 100)
      ELSE 0
    END
  FROM profiles p
  LEFT JOIN loans l ON (l.borrower_id = p.id OR l.lender_id = p.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_code() TO authenticated;
GRANT EXECUTE ON FUNCTION get_borrower_statistics() TO authenticated;

-- =====================================================
-- 8. CREATE PUBLIC VIEW
-- =====================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS public_invitation_lookup;

-- Create view for public invitation lookup
CREATE VIEW public_invitation_lookup AS
SELECT 
  code,
  email,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at < NOW() THEN 'expired'
    WHEN accepted THEN 'accepted'
    ELSE 'pending'
  END as status
FROM invitations
WHERE accepted = FALSE AND expires_at > NOW();

-- Grant access to the view
GRANT SELECT ON public_invitation_lookup TO anon;
GRANT SELECT ON public_invitation_lookup TO authenticated;

-- =====================================================
-- 9. SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Invitation system setup completed successfully!';
END $$;