CREATE TABLE whatsapp_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  opted_in BOOLEAN DEFAULT TRUE,
  notification_types JSONB DEFAULT '["loan_status", "payment_due", "blacklist_warning"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
);
