# Fix Authentication Issues - Step by Step Guide

## Problem
Users cannot sign up because the `profiles` table is missing an INSERT policy, preventing new profile creation after auth user is created.

## Solution Steps

### 1. Run the SQL Fix Script in Supabase

Go to your Supabase Dashboard > SQL Editor and run the following script:

```sql
-- Fix authentication signup issues
-- This script adds the missing INSERT policy for the profiles table

-- 1. First, check if the INSERT policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert own profile on signup'
    ) THEN
        -- Create INSERT policy for profiles table
        CREATE POLICY "Users can insert own profile on signup" ON profiles
            FOR INSERT 
            WITH CHECK (auth.uid() = auth_user_id);
        RAISE NOTICE 'Created INSERT policy for profiles table';
    ELSE
        RAISE NOTICE 'INSERT policy already exists for profiles table';
    END IF;
END $$;

-- 2. Ensure the profiles table has proper RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Also ensure borrower_profiles can be created by users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'borrower_profiles' 
        AND policyname = 'Users can insert own borrower profile'
    ) THEN
        -- Create INSERT policy for borrower_profiles table
        CREATE POLICY "Users can insert own borrower profile" ON borrower_profiles
            FOR INSERT 
            WITH CHECK (
                user_id IN (
                    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
                )
            );
        RAISE NOTICE 'Created INSERT policy for borrower_profiles table';
    ELSE
        RAISE NOTICE 'INSERT policy already exists for borrower_profiles table';
    END IF;
END $$;
```

### 2. Backend Code Updates Applied

The following updates have been made to `app/actions/auth-signup.ts`:

1. **Simplified role assignment**: Now uses the `role` column directly in the profiles table instead of the complex `user_profile_roles` junction table
2. **Better error handling**: Added detailed error logging
3. **Automatic borrower profile creation**: When a borrower signs up, their borrower profile is created automatically
4. **Cleanup on failure**: If profile creation fails, the auth user is deleted to prevent orphaned auth records

### 3. Verify the Fix

After running the SQL script:

1. Check that the policies were created successfully in Supabase Dashboard > Authentication > Policies
2. Try signing up a new user through your application
3. Check the Supabase logs for any errors

### 4. Common Issues and Solutions

**Issue: "Failed to create profile" error**
- Make sure the SQL script above was run successfully
- Check that RLS is enabled on the profiles table
- Verify the auth_user_id is being passed correctly

**Issue: Service role key not set**
- The cleanup functionality requires `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`
- This is optional - the signup will still work without it, but failed signups won't be cleaned up automatically

**Issue: Role assignment failing**
- The code now uses a simple `role` column in the profiles table
- Make sure your database schema includes this column (VARCHAR(50))

### 5. Testing

Test the signup flow with:
1. A new borrower account
2. A new lender account
3. Invalid data to ensure error handling works

The fixes ensure that:
- New users can sign up successfully
- Profiles are created with the correct role
- Borrower profiles are created automatically for borrowers
- Errors are handled gracefully