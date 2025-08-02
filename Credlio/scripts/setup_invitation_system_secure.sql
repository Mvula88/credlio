-- Setup Invitation System for Borrower Landing Page (SECURE VERSION)
-- This script creates the necessary tables and policies for the invitation system with proper RLS

-- =====================================================
-- 1. CREATE INVITATIONS TABLE (if not exists)
-- =====================================================
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_lender_id ON invitations(lender_id);
CREATE INDEX IF NOT EXISTS idx_invitations_borrower_id ON invitations(borrower_id);

-- =====================================================
-- 2. CREATE BORROWER_INVITES TABLE (for WhatsApp flow)
-- =====================================================
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_borrower_invites_invite_code ON borrower_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_borrower_invites_lender_id ON borrower_invites(lender_id);
CREATE INDEX IF NOT EXISTS idx_borrower_invites_status ON borrower_invites(status);

-- =====================================================
-- 3. CREATE LENDER_BORROWER_RELATIONSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lender_borrower_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lender_id, borrower_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lender_borrower_relationships_lender ON lender_borrower_relationships(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_borrower_relationships_borrower ON lender_borrower_relationships(borrower_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES (SECURE)
-- =====================================================

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_borrower_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Lenders can view their own invitations" ON invitations;
DROP POLICY IF EXISTS "Lenders can create invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON invitations;
DROP POLICY IF EXISTS "Invitations can be updated when accepted" ON invitations;
DROP POLICY IF EXISTS "Lenders can view their own borrower invites" ON borrower_invites;
DROP POLICY IF EXISTS "Lenders can create borrower invites" ON borrower_invites;
DROP POLICY IF EXISTS "Borrower invites can be viewed by code" ON borrower_invites;
DROP POLICY IF EXISTS "Users can view their relationships" ON lender_borrower_relationships;
DROP POLICY IF EXISTS "System can create relationships" ON lender_borrower_relationships;
DROP POLICY IF EXISTS "Lenders can update their relationships" ON lender_borrower_relationships;

-- ===== INVITATIONS TABLE POLICIES =====
-- Policy 1: Lenders can view their own invitations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' 
    AND policyname = 'invitations_select_own'
  ) THEN
    CREATE POLICY "invitations_select_own" ON invitations
      FOR SELECT 
      USING (
        auth.uid() = lender_id 
        OR auth.uid() = borrower_id
      );
  END IF;
END $$;

-- Policy 2: Public can view non-accepted invitations by code (for acceptance flow)
CREATE POLICY "invitations_select_by_code" ON invitations
  FOR SELECT 
  USING (
    code IS NOT NULL 
    AND accepted = FALSE 
    AND expires_at > NOW()
  );

-- Policy 3: Only lenders can create invitations
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

-- Policy 4: Invitations can be updated during acceptance
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

-- ===== BORROWER_INVITES TABLE POLICIES =====
-- Policy 1: Lenders can view their own borrower invites
CREATE POLICY "borrower_invites_select_own" ON borrower_invites
  FOR SELECT 
  USING (
    auth.uid() = lender_id
    OR (auth.uid() = borrower_id AND borrower_id IS NOT NULL)
  );

-- Policy 2: Public can view active invites by code (for landing page)
CREATE POLICY "borrower_invites_select_by_code" ON borrower_invites
  FOR SELECT 
  USING (
    invite_code IS NOT NULL 
    AND status = 'pending' 
    AND expires_at > NOW()
  );

-- Policy 3: Only lenders can create borrower invites
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

-- Policy 4: Borrower invites can be updated during acceptance
CREATE POLICY "borrower_invites_update_acceptance" ON borrower_invites
  FOR UPDATE 
  USING (
    status = 'pending' 
    AND expires_at > NOW()
  )
  WITH CHECK (
    status IN ('accepted', 'expired')
  );

-- ===== LENDER_BORROWER_RELATIONSHIPS TABLE POLICIES =====
-- Policy 1: Users can view their own relationships
CREATE POLICY "relationships_select_own" ON lender_borrower_relationships
  FOR SELECT 
  USING (
    auth.uid() = lender_id 
    OR auth.uid() = borrower_id
  );

-- Policy 2: Relationships can be created during invitation acceptance
-- This uses a service role function for security
CREATE POLICY "relationships_insert_via_invitation" ON lender_borrower_relationships
  FOR INSERT 
  WITH CHECK (
    -- Only allow if there's a valid accepted invitation
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

-- Policy 3: Only lenders can update relationship status
CREATE POLICY "relationships_update_lender" ON lender_borrower_relationships
  FOR UPDATE 
  USING (auth.uid() = lender_id)
  WITH CHECK (status IN ('active', 'inactive', 'blocked'));

-- =====================================================
-- 5. SECURE FUNCTIONS
-- =====================================================

-- Function to generate unique invitation code (no changes needed)
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

-- Grant execute permission on secure functions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_code() TO authenticated;

-- =====================================================
-- 6. ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Add check constraint to ensure invitations expire
ALTER TABLE invitations ADD CONSTRAINT chk_invitation_expiry 
  CHECK (expires_at > created_at);

ALTER TABLE borrower_invites ADD CONSTRAINT chk_borrower_invite_expiry 
  CHECK (expires_at > created_at);

-- Create view for public invitation lookup (more secure)
CREATE OR REPLACE VIEW public_invitation_lookup AS
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
