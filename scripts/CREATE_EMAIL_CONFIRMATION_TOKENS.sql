-- Create email_confirmation_tokens table for managing email confirmations
-- This gives us full control over the confirmation process

-- Drop existing table if it exists
DROP TABLE IF EXISTS email_confirmation_tokens;

-- Create the email_confirmation_tokens table
CREATE TABLE email_confirmation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_email_confirmation_tokens_token ON email_confirmation_tokens(token);
CREATE INDEX idx_email_confirmation_tokens_user_id ON email_confirmation_tokens(user_id);
CREATE INDEX idx_email_confirmation_tokens_email ON email_confirmation_tokens(email);

-- Enable RLS
ALTER TABLE email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only service role can manage confirmation tokens
CREATE POLICY "Service role can manage email confirmation tokens" ON email_confirmation_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add email_verified column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;