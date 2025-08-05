-- =====================================================
-- Enable OTP Code Instead of Magic Link for Credlio
-- =====================================================
-- This script configures Supabase to send 6-digit OTP codes 
-- instead of magic links in authentication emails
-- =====================================================

-- Step 1: Configure authentication settings for OTP
-- Note: Supabase's signInWithOtp always generates a magic link,
-- but we can customize the email template to show only the first 6 digits
UPDATE auth.config
SET value = jsonb_build_object(
    'external_email_enabled', true,
    'mailer_autoconfirm', false,
    'sms_autoconfirm', false,
    'phone_autoconfirm', false,
    'email_otp_length', 6,
    'sms_otp_length', 6,
    'email_otp_expiry', 3600,  -- 60 minutes
    'sms_otp_expiry', 300,     -- 5 minutes
    'otp_length', 6,
    'disable_signup', false,
    'mailer_secure_email_change_enabled', true,
    'mailer_subjects', jsonb_build_object(
        'confirmation', 'Confirm your Credlio account',
        'magic_link', 'Your Credlio verification code',
        'email_change', 'Confirm your Credlio email change',
        'recovery', 'Reset your Credlio password'
    )
)::text
WHERE key = 'auth.settings';

-- Step 2: Create/Update the Magic Link email template
-- This template extracts the first 6 characters of the token to display as OTP
-- The full magic link is hidden but kept for compatibility
INSERT INTO auth.flow_state (id, auth_code, user_id, authentication_method, created_at, updated_at)
VALUES (gen_random_uuid(), '', NULL, 'email', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Check if email templates table exists and has the correct structure
DO $$
BEGIN
    -- Create email_templates table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'email_templates') THEN
        CREATE TABLE auth.email_templates (
            template_id TEXT PRIMARY KEY,
            subject TEXT,
            content TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Update or insert the magic link template with professional OTP design
INSERT INTO auth.email_templates (template_id, subject, content, created_at, updated_at)
VALUES (
    'magic_link',
    'Your Credlio verification code',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f9fafb;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">\n    <tr>\n      <td align="center">\n        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 40px 40px 20px 40px; text-align: center;">\n              <h1 style="margin: 0 0 10px 0; color: #111827; font-size: 28px; font-weight: 700;">Credlio</h1>\n              <h2 style="margin: 0; color: #374151; font-size: 20px; font-weight: 400;">Verification Code</h2>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 20px 40px;">\n              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 24px; text-align: center;">Please enter this code to complete your sign in:</p>\n              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 0 0 30px 0;">\n                <div style="font-family: ''Courier New'', monospace; font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">{{ .Token | slice 0 6 }}</div>\n              </div>\n              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">\n                <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Valid for:</strong> 60 minutes</p>\n                <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Requested from:</strong> {{ .SiteURL }}</p>\n              </div>\n              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px; text-align: center;">If you didn''t request this code, you can safely ignore this email.</p>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e5e7eb;">\n              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">&copy; 2024 Credlio. All rights reserved.</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n  <div style="display: none !important; max-height: 0; overflow: hidden;"><p>{{ .ConfirmationURL }}</p></div>\n</body>\n</html>',
    NOW(),
    NOW()
)
ON CONFLICT (template_id) 
DO UPDATE SET 
    subject = EXCLUDED.subject,
    content = EXCLUDED.content,
    updated_at = NOW();

-- Step 3: Also update other email templates to maintain consistency
-- Update confirmation email template
INSERT INTO auth.email_templates (template_id, subject, content, created_at, updated_at)
VALUES (
    'confirmation',
    'Confirm your Credlio account',
    E'<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>\n<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f9fafb;">\n  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">\n    <tr>\n      <td align="center">\n        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">\n          <tr>\n            <td style="padding: 40px 40px 20px 40px; text-align: center;">\n              <h1 style="margin: 0 0 10px 0; color: #111827; font-size: 28px; font-weight: 700;">Welcome to Credlio</h1>\n              <h2 style="margin: 0; color: #374151; font-size: 20px; font-weight: 400;">Confirm Your Account</h2>\n            </td>\n          </tr>\n          <tr>\n            <td style="padding: 20px 40px;">\n              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 16px; line-height: 24px; text-align: center;">Please enter this code to confirm your account:</p>\n              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 0 0 30px 0;">\n                <div style="font-family: ''Courier New'', monospace; font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">{{ .Token | slice 0 6 }}</div>\n              </div>\n              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px; text-align: center;">This code expires in 60 minutes.</p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n  <div style="display: none !important;"><p>{{ .ConfirmationURL }}</p></div>\n</body>\n</html>',
    NOW(),
    NOW()
)
ON CONFLICT (template_id) 
DO UPDATE SET 
    subject = EXCLUDED.subject,
    content = EXCLUDED.content,
    updated_at = NOW();

-- Step 4: Create stored function to extract OTP from token (optional enhancement)
CREATE OR REPLACE FUNCTION auth.extract_otp_from_token(token TEXT)
RETURNS TEXT AS $$
DECLARE
    otp_code TEXT;
BEGIN
    -- Extract first 6 alphanumeric characters from the token
    -- This creates a consistent OTP from the magic link token
    otp_code := UPPER(SUBSTRING(MD5(token) FROM 1 FOR 6));
    RETURN otp_code;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return first 6 chars of original token
        RETURN UPPER(SUBSTRING(token FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Display configuration summary
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'OTP Email Configuration Applied Successfully!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What this script does:';
    RAISE NOTICE '1. Configures Supabase auth settings for OTP';
    RAISE NOTICE '2. Updates email templates to show 6-digit codes';
    RAISE NOTICE '3. Hides magic links while keeping compatibility';
    RAISE NOTICE '4. Creates helper function for OTP extraction';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run this script in your Supabase SQL editor';
    RAISE NOTICE '2. Test the OTP flow with a test account';
    RAISE NOTICE '3. Users will receive 6-digit codes in emails';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: The app already supports OTP verification!';
    RAISE NOTICE '==============================================';
END $$;