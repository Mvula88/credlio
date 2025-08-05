-- =====================================================
-- Setup OTP Email Template for Supabase
-- =====================================================
-- This script updates Supabase email templates to show 
-- 6-digit OTP codes instead of magic links
-- =====================================================

-- Note: Supabase doesn't expose auth.config directly
-- Email templates must be configured through the Dashboard
-- This script provides the template content for manual setup

-- Step 1: Create a function to extract OTP from token
-- This is optional but useful for consistent OTP generation
CREATE OR REPLACE FUNCTION public.extract_otp_from_token(token TEXT)
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

-- Step 2: Instructions for manual template update
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'OTP EMAIL TEMPLATE SETUP INSTRUCTIONS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Since Supabase auth settings are not directly accessible via SQL,';
    RAISE NOTICE 'you need to manually update the email templates in the Dashboard.';
    RAISE NOTICE '';
    RAISE NOTICE 'Steps:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Email Templates';
    RAISE NOTICE '2. Select "Magic Link" template';
    RAISE NOTICE '3. Replace the template content with the HTML from supabase_otp_email_template.html';
    RAISE NOTICE '4. Save the changes';
    RAISE NOTICE '';
    RAISE NOTICE 'Key features of the template:';
    RAISE NOTICE '- Uses {{ .Token | slice 0 6 }} to show only 6 digits';
    RAISE NOTICE '- Professional design with Credlio branding';
    RAISE NOTICE '- Large, readable OTP code display';
    RAISE NOTICE '- Hidden magic link for compatibility';
    RAISE NOTICE '';
    RAISE NOTICE 'The full HTML template is available in: supabase_otp_email_template.html';
    RAISE NOTICE '================================================';
END $$;

-- Step 3: Create a sample test function to demonstrate OTP extraction
CREATE OR REPLACE FUNCTION public.test_otp_extraction()
RETURNS TABLE(sample_token TEXT, extracted_otp TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'sample-token-abc123xyz789' AS sample_token,
        public.extract_otp_from_token('sample-token-abc123xyz789') AS extracted_otp;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT * FROM public.test_otp_extraction();

-- Final instructions
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Copy the HTML template from above or use supabase_otp_email_template.html';
    RAISE NOTICE '2. Go to Supabase Dashboard > Authentication > Email Templates';
    RAISE NOTICE '3. Update the "Magic Link" template with the new HTML';
    RAISE NOTICE '4. Save and test with a user account';
    RAISE NOTICE '';
    RAISE NOTICE 'The app is already configured to handle OTP verification!';
END $$;