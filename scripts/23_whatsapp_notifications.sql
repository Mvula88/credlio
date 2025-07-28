-- WhatsApp notification preferences and logs
CREATE TABLE IF NOT EXISTS whatsapp_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  opted_in BOOLEAN DEFAULT TRUE,
  notification_types JSONB DEFAULT '["loan_status", "payment_due", "blacklist_warning"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  external_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE whatsapp_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "whatsapp_preferences_own_data" ON whatsapp_preferences 
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "whatsapp_message_log_own_data" ON whatsapp_message_log 
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "whatsapp_message_log_admin_access" ON whatsapp_message_log 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_profile_roles upr ON p.id = upr.profile_id
      JOIN user_roles ur ON upr.role_id = ur.id
      WHERE p.auth_user_id = auth.uid() AND ur.role_name = 'super_admin'
    )
  );
