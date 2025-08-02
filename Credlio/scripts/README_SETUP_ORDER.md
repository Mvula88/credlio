# Credlio Database Setup Guide

## ⚠️ ONLY RUN THESE SCRIPTS IN THIS EXACT ORDER:

### Step 1: Main Setup ✅ (You've already done this)
**Script:** `COMPLETE_CREDLIO_SETUP.sql`
- Creates all base tables, users, profiles, etc.
- Sets up basic RLS policies

### Step 2: Fix Risky Borrower Feature
**Script:** `cleanup_and_fix_risky_borrower.sql`
- Run this INSTEAD of any other risky borrower script
- This handles all the setup regardless of what you've already run

### Step 3: Add Lender-Borrower Relationships
**Script:** `add_lender_borrower_relationships.sql`
- Adds "My Borrowers" feature for lenders
- Creates active_loans and loan_payments tables

### Step 4: (Optional) Enable Realtime
In Supabase Dashboard > Database > Tables, enable realtime for:
- profiles
- loan_requests  
- loan_offers
- notifications
- active_loans

## ❌ DO NOT RUN THESE SCRIPTS (Already handled by cleanup script):
- add_risky_borrower_tracking.sql
- add_risky_borrower_tracking_FIXED.sql  
- add_risky_borrower_tracking_SAFE.sql
- add_risky_borrower_columns_only.sql
- check_current_state.sql (only for checking, not setup)

## 📝 Notes:
- If you get "already exists" errors, that's OK - it means that part is already set up
- The cleanup_and_fix_risky_borrower.sql script handles all states safely
- After setup, verify in Authentication > Policies that RLS is enabled

## ✅ Summary:
You only need to run 2 more scripts:
1. `cleanup_and_fix_risky_borrower.sql`
2. `add_lender_borrower_relationships.sql`

Then you're done!