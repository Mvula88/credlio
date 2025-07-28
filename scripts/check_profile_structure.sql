-- First, let's check the actual structure of the profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what data is in profiles table
SELECT * FROM profiles LIMIT 3;

-- Check if there's an email in auth.users instead
SELECT id, email, created_at FROM auth.users LIMIT 3;

-- Check the relationship between auth.users and profiles
SELECT 
    au.email,
    p.id as profile_id,
    p.auth_user_id,
    p.first_name,
    p.last_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.auth_user_id
LIMIT 5;
