# Fix "Database error saving new user" Issue

## What I've Fixed

### 1. **Updated Signup Flow**
- The signup form now properly uses the server action instead of direct database insertion
- Country selection now correctly fetches the country UUID from the database
- Added detailed error logging to help identify the exact issue

### 2. **Enhanced Error Handling**
- Added specific error messages for different database error codes
- Console now logs full error details including error codes
- Toast notifications show the actual error message

### 3. **Fixed Database Insert Logic**
- Now properly fetches `country_id` from the countries table using the country code
- Correctly passes all required fields to the profiles table

## Steps to Complete the Fix

### Step 1: Check for Existing Auth User
Run this SQL in your Supabase SQL Editor to check if the email already exists:

```sql
-- Check if there's an existing auth user
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created_at,
    p.id as profile_id
FROM auth.users au
LEFT JOIN profiles p ON p.auth_user_id = au.id
WHERE au.email = 'inekela34@gmail.com';
```

### Step 2: Clean Up Orphaned Auth User (if needed)
If the above query shows an auth user WITHOUT a profile (profile_id is NULL), run:

```sql
DELETE FROM auth.users 
WHERE email = 'inekela34@gmail.com' 
AND id NOT IN (SELECT auth_user_id FROM profiles);
```

### Step 3: Verify Country Exists
Make sure Namibia is in your countries table:

```sql
SELECT id, name, code FROM countries WHERE code = 'NA';
```

If it doesn't exist, run:
```sql
INSERT INTO countries (name, code, currency_code) 
VALUES ('Namibia', 'NA', 'NAD');
```

### Step 4: Test Signup Again

1. **Open Browser Console** (F12) before trying to sign up
2. **Try to sign up** with the form
3. **Check the console** for detailed error messages like:
   - "Detailed signup error: ..."
   - "Error details: ..."

### Step 5: Common Issues and Solutions

#### If you see "Permission denied":
The INSERT policy is already in place, so this shouldn't happen. But if it does, double-check that RLS is enabled.

#### If you see "duplicate key" or "already exists":
The email is already registered. Use the cleanup SQL above.

#### If you see "foreign key violation":
The country might not exist in the database. Check Step 3.

#### If you see "null value in column":
Check which field is null in the error details and ensure all required fields are being passed.

## What the Error Message Will Tell You Now

The updated code will show:
1. The exact database error code (e.g., 23505 for duplicates)
2. Which constraint or field is causing the issue
3. A user-friendly message based on the error type

## Still Having Issues?

After running the cleanup and trying again, if you still get an error:
1. Copy the full error message from the browser console
2. Check the Supabase logs for more details
3. Run the debug script: `scripts/debug_signup_issue.sql`

The enhanced error logging will now show you exactly what's failing in the database insert.