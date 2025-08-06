# Database Setup Guide - Run Scripts in This Order

## Step 1: Fix Missing Tables and Columns
Run `fix_all_tables_safe.sql` first to create all missing tables and columns safely.

This script will:
- Drop and recreate subscription_plans table with correct structure
- Create loans table if not exists
- Create all other core tables (loan_repayments, loan_requests, etc.)
- Add all missing columns to profiles table
- Create support tables (audit_logs, risk_alerts, etc.)

## Step 2: Setup Backend Functions and RLS
Run `complete_dashboard_backend.sql` to set up all dashboard functions and RLS policies.

This script will:
- Create dashboard functions for all roles
- Set up Row Level Security policies
- Create performance indexes
- Grant proper permissions

## Step 3: Create Admin User
Run `simple_admin_setup.sql` after creating your auth user in Supabase.

Before running this script:
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Invite User" 
3. Enter your email (e.g., admin@credlio.com)
4. After the user is created, update the email in the script to match
5. Run the script to create the admin profile

## How to Run Scripts in Supabase

1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query" button
4. Copy the entire content of the SQL file
5. Paste it into the SQL editor
6. Click "Run" button
7. Check the output messages for confirmation

## Order Summary

1. **fix_all_tables_safe.sql** - Creates all missing tables and columns
2. **complete_dashboard_backend.sql** - Sets up functions and RLS
3. **simple_admin_setup.sql** - Creates your admin profile

## Troubleshooting

If you get any errors:
- Make sure you're running the scripts in order
- For the admin setup, ensure you've created the auth user first
- Check that the email in the script matches your auth user email exactly

## After Setup

Once all scripts are run successfully, you can:
- Login with your admin credentials
- Access /admin/dashboard for full system control
- Access /admin/country/dashboard for country-specific management
- All dashboards will properly fetch data from Supabase