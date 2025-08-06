# Complete Database Setup Guide for Credlio

## 🚨 IMPORTANT: Run These Scripts in Order

This guide will help you set up your Supabase database completely to ensure all data is fetched properly.

## Step 1: Run the Main Database Fix Script

This script creates all necessary tables, indexes, and RLS policies:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of: `scripts/FIX_ALL_DATA_FETCHING.sql`
5. Click "Run"

✅ This script will:
- Create all missing tables
- Add missing columns to existing tables
- Set up proper foreign key relationships
- Enable Row Level Security
- Create necessary policies
- Insert essential data (countries, user roles)
- Create indexes for performance

## Step 2: Populate Test Data

After the main setup, add test data to see your application working:

1. In SQL Editor, create another new query
2. Copy and paste the contents of: `scripts/POPULATE_TEST_DATA.sql`
3. Click "Run"

✅ This will add:
- Sample user profiles (borrowers and lenders)
- Sample loan requests
- Sample loan offers
- Sample payments
- Sample notifications
- Test blacklist entries
- Smart tags and badges

## Step 3: Set Up Chat System

Enable the chat/messaging functionality:

1. In SQL Editor, create another new query
2. Copy and paste the contents of: `scripts/setup_chat_system.sql`
3. Click "Run"

✅ This enables:
- Direct messaging between users
- Real-time message updates
- Typing indicators
- Read receipts

## Step 4: Enable Realtime

For real-time features to work:

1. Go to Supabase Dashboard > Database > Replication
2. Enable replication for these tables:
   - `messages`
   - `typing_indicators`
   - `notifications`
   - `loan_requests`
   - `loan_offers`

## Step 5: Verify Setup

Run this verification query to ensure everything is set up:

```sql
-- Check table counts
SELECT 
    'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'countries', COUNT(*) FROM public.countries
UNION ALL
SELECT 'user_roles', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'loan_requests', COUNT(*) FROM public.loan_requests
UNION ALL
SELECT 'loan_offers', COUNT(*) FROM public.loan_offers
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications;
```

Expected minimum counts:
- countries: 10+
- user_roles: 5
- profiles: Will depend on your users

## Step 6: Create Test Users (Optional)

If you need test users for development:

```sql
-- This creates test auth users - only use in development!
-- You'll need to use Supabase Auth Admin to create users properly

-- For testing, you can manually create users through:
-- 1. Supabase Dashboard > Authentication > Users > Invite
-- 2. Or use the signup flow in your application
```

## Common Issues and Solutions

### Issue: "No data showing in the application"

**Solution:** Ensure you've run both scripts in order:
1. `FIX_ALL_DATA_FETCHING.sql`
2. `POPULATE_TEST_DATA.sql`

### Issue: "Permission denied" errors

**Solution:** Check that RLS policies are properly set:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- If any show 'f' (false), enable RLS:
ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;
```

### Issue: "Foreign key constraint violations"

**Solution:** Ensure tables are created in the correct order. The `FIX_ALL_DATA_FETCHING.sql` script handles this.

### Issue: "Chat not working"

**Solution:** 
1. Ensure you ran `setup_chat_system.sql`
2. Enable realtime for the messages table
3. Check browser console for WebSocket errors

## Verification Checklist

- [ ] All tables created (run verification query)
- [ ] Countries table has data
- [ ] User roles table has 5 roles
- [ ] RLS is enabled on all tables
- [ ] Realtime is enabled for required tables
- [ ] Test users can log in
- [ ] Data appears in the application

## Quick Test

After setup, test your application:

1. **Sign up** as a new user
2. **Check profile** is created automatically
3. **Navigate** to different sections:
   - Borrower dashboard
   - Lender dashboard
   - Messages
4. **Create** a loan request (as borrower)
5. **Make** an offer (as lender)
6. **Send** a message to another user

## Support Scripts

Additional helpful scripts in the `/scripts` folder:

- `MASTER_DATABASE_SETUP.sql` - Alternative comprehensive setup
- `VERIFY_DATABASE_SETUP.sql` - Detailed verification
- `CHECK_AND_FIX_RLS.sql` - RLS troubleshooting
- `CHECK_DATABASE_STATE.sql` - Current state inspection

## Next Steps

Once everything is working:

1. **Commit your changes:**
   ```bash
   git add -A
   git commit -m "Fix database setup and data fetching"
   git push
   ```

2. **Deploy to production:**
   - Run the same scripts in your production Supabase instance
   - Use environment variables for production URLs
   - Do NOT run `POPULATE_TEST_DATA.sql` in production

3. **Monitor:**
   - Check Supabase logs for any errors
   - Monitor API response times
   - Set up error tracking (Sentry, etc.)

## Need Help?

If you're still experiencing issues:

1. Check the Supabase logs: Dashboard > Logs > API
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure Supabase project is not paused
5. Check that your Supabase URL and keys are correct in `.env.local`

Remember to restart your development server after making database changes:
```bash
npm run dev
```