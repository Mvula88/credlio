-- =====================================================
-- VERIFY SECURE AUTH SETUP
-- =====================================================

-- 1. Check if all columns were added to profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'national_id_hash', 'id_type', 'date_of_birth', 'id_verified', 'failed_login_attempts', 'account_locked_until')
ORDER BY column_name;

-- 2. Check if all new tables were created
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_verifications', 'verification_alerts', 'user_devices', 'login_attempts', 'identity_verifications')
ORDER BY table_name;

-- 3. Check if functions were created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_unique_username', 'check_duplicate_identity');

-- 4. Check RLS is enabled on new tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('document_verifications', 'verification_alerts', 'user_devices', 'login_attempts', 'identity_verifications');

-- 5. Test username generation (optional)
-- SELECT generate_unique_username('KE');

-- If all queries return results, your setup is complete!