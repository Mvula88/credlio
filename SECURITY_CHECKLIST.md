# 🔒 SECURITY CHECKLIST - BEFORE PRODUCTION

## ⚠️ CRITICAL SECURITY TASKS

### 1. ❌ RE-ENABLE RLS ON PROFILES TABLE
**Status:** Currently DISABLED for development
**Risk:** Users can see/modify other users' data
**Fix:** Run `scripts/ENABLE_RLS_FOR_PRODUCTION.sql`

### 2. ✅ OTP Verification
**Status:** Implemented
**Risk:** Low - already secured with email verification

### 3. ⚠️ Environment Variables
**Check:** Ensure all API keys are in `.env.local`, not in code
- [ ] Supabase keys
- [ ] Resend API key
- [ ] Stripe keys

### 4. ⚠️ Database Permissions
**Check:** Review all granted permissions
- [ ] Remove unnecessary GRANT ALL statements
- [ ] Limit service role access

## HOW TO FIX RLS BEFORE PRODUCTION:

1. Go to Supabase SQL Editor
2. Run: `scripts/ENABLE_RLS_FOR_PRODUCTION.sql`
3. Test that signup/signin still works
4. Test that users can only see their own data

## AUTOMATED CHECK:
Add this to your deployment pipeline:
```sql
-- This query will FAIL if RLS is disabled
SELECT 
  CASE 
    WHEN NOT relrowsecurity THEN 
      ERROR('SECURITY RISK: RLS is disabled on profiles table!')
    ELSE 
      'OK'
  END
FROM pg_class 
WHERE relname = 'profiles';
```

## LAST UPDATED: January 2025
## REVIEW BEFORE: Going live with real users