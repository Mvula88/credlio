-- Setup Invitation System for Borrower Landing Page
-- This script creates the necessary tables and policies for the invitation system

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
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE lender_borrower_relationships ENABLE ROW LEVEL SECURITY;

-- Invitations policies
CREATE POLICY "Lenders can view their own invitations" ON invitations
  FOR SELECT USING (lender_id = auth.uid());

CREATE POLICY "Lenders can create invitations" ON invitations
  FOR INSERT WITH CHECK (lender_id = auth.uid());

CREATE POLICY "Anyone can view invitation by code" ON invitations
  FOR SELECT USING (TRUE);

CREATE POLICY "Invitations can be updated when accepted" ON invitations
  FOR UPDATE USING (code IS NOT NULL);

-- Borrower invites policies
CREATE POLICY "Lenders can view their own borrower invites" ON borrower_invites
  FOR SELECT USING (lender_id = auth.uid());

CREATE POLICY "Lenders can create borrower invites" ON borrower_invites
  FOR INSERT WITH CHECK (lender_id = auth.uid());

CREATE POLICY "Borrower invites can be viewed by code" ON borrower_invites
  FOR SELECT USING (TRUE);

-- Lender-borrower relationships policies
CREATE POLICY "Users can view their relationships" ON lender_borrower_relationships
  FOR SELECT USING (lender_id = auth.uid() OR borrower_id = auth.uid());

CREATE POLICY "System can create relationships" ON lender_borrower_relationships
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Lenders can update their relationships" ON lender_borrower_relationships
  FOR UPDATE USING (lender_id = auth.uid());

-- =====================================================
-- 5. FUNCTIONS FOR INVITATION HANDLING
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

-- Function to sync invitations between tables
CREATE OR REPLACE FUNCTION sync_invitation_to_borrower_invite()
RETURNS TRIGGER AS $$
BEGIN
  -- When a borrower_invite is created, also create an invitation record
  IF TG_OP = 'INSERT' THEN
    INSERT INTO invitations (
      code,
      lender_id,
      email,
      organization_id,
      created_at,
      expires_at
    )
    VALUES (
      NEW.invite_code,
      NEW.lender_id,
      NEW.borrower_phone || '@invited', -- Placeholder email
      (SELECT country_id FROM profiles WHERE id = NEW.lender_id),
      NEW.created_at,
      NEW.expires_at
    )
    ON CONFLICT (code) DO NOTHING;
  END IF;
  
  -- When a borrower_invite is accepted, update the invitation
  IF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE invitations
    SET 
      accepted = TRUE,
      accepted_at = NEW.accepted_at,
      borrower_id = NEW.borrower_id
    WHERE code = NEW.invite_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync invitations
DROP TRIGGER IF EXISTS sync_borrower_invite_trigger ON borrower_invites;
CREATE TRIGGER sync_borrower_invite_trigger
  AFTER INSERT OR UPDATE ON borrower_invites
  FOR EACH ROW
  EXECUTE FUNCTION sync_invitation_to_borrower_invite();

-- =====================================================
-- 6. STATISTICS FUNCTIONS FOR LANDING PAGE
-- =====================================================

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_borrower_statistics() TO authenticated;

-- =====================================================
-- 7. CLEANUP EXPIRED INVITATIONS
-- =====================================================

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  -- Update borrower_invites
  UPDATE borrower_invites
  SET status = 'expired'
  WHERE expires_at < NOW() AND status = 'pending';
  
  -- We don't delete invitation records, just mark them as expired
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a cron job to run this periodically
-- This would require pg_cron extension
-- SELECT cron.schedule('cleanup-invitations', '0 0 * * *', 'SELECT cleanup_expired_invitations();');