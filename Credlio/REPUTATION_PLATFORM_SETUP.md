# Credlio Reputation Platform Setup Guide

## Overview

Credlio is a professional borrower reputation platform that helps build trust between borrowers and lenders by tracking loan behavior and payment history. This platform does NOT provide loans or store documents - it's purely a reputation tracking system.

## Database Setup

### Step 1: Run Database Scripts in Order

Execute these SQL scripts in your Supabase SQL editor in this exact order:

1. **Authentication & Profiles**
   - `25_add_role_to_profiles.sql` - Adds role column to profiles table

2. **Reputation Platform Schema**
   - `30_reputation_platform_schema.sql` - Creates all necessary tables
   - `31_reputation_platform_rls.sql` - Sets up Row Level Security policies
   - `32_reputation_platform_functions.sql` - Creates database functions and triggers

### Step 2: Create Admin User

Follow the instructions in `ADMIN_SETUP.md` to create your admin user.

### Step 3: Enable Realtime (Optional)

In Supabase Dashboard, enable realtime for these tables if you want live updates:

- `loan_requests`
- `loan_offers`
- `blacklists`
- `borrower_stats`

## Platform Features

### For Lenders

1. **Blacklist Management**
   - View system-generated blacklists (3+ defaults)
   - Manually blacklist borrowers with evidence
   - See detailed reasons and evidence

2. **Loan Request Marketplace**
   - Browse all active loan requests
   - View borrower reputation scores
   - Make offers with custom terms

3. **Active Loan Tracking**
   - Monitor current loans
   - Record payment behaviors
   - Track document verification

4. **Document Checklist**
   - Track offline document collection
   - No documents stored in the system
   - Checklist includes:
     - National ID/Passport
     - Proof of Income
     - Proof of Address
     - Bank Statements
     - Employment Letter
     - Guarantor Documents

### For Borrowers

1. **Reputation Dashboard**
   - View reputation score (0-100)
   - See loan statistics
   - Track payment behavior history

2. **Blacklist Status**
   - See if blacklisted and by whom
   - View reasons and evidence
   - Get improvement suggestions

3. **Loan Requests**
   - Submit requests to marketplace
   - Specify amount, purpose, and terms
   - Visible to all lenders

4. **Offer Management**
   - Review offers from lenders
   - Accept/reject offers
   - Track active loans

## How the Reputation System Works

### Reputation Score Calculation

Base score: 50/100

**Positive Factors:**

- On-time payments: +5 points each
- Completed loans: +2 points each

**Negative Factors:**

- Late payments: -3 points each
- Very late payments: -7 points each
- Defaults: -15 points each
- Blacklists: -20 points each

### Automatic Blacklisting

Borrowers are automatically blacklisted after 3 loan defaults.

### Payment Behavior Categories

- **Early**: Payment made 7+ days before due date
- **On-time**: Payment made 0-6 days before due date
- **Late**: Payment made 1-7 days after due date
- **Very Late**: Payment made 8-30 days after due date
- **Defaulted**: Payment made 31+ days after due date or not at all

## Important Notices

### Platform Disclaimers

1. **No Financial Services**: This platform does not provide loans or financial services
2. **No Document Storage**: All documents must be handled offline
3. **Reputation Only**: Platform tracks reputation and facilitates connections only

### Security Considerations

1. All user data is protected by Row Level Security
2. Users can only see data relevant to them
3. Admins have full access for moderation
4. Financial transactions happen offline

## Testing the Platform

### As a Lender

1. Sign up as a lender
2. Browse the loan request marketplace
3. Make an offer on a request
4. Track accepted offers as active loans
5. Record payment behaviors
6. Use document checklist

### As a Borrower

1. Sign up as a borrower
2. Create a loan request
3. Review incoming offers
4. Accept an offer
5. View your reputation score
6. Check blacklist status

## Maintenance

### Regular Tasks

1. Monitor for system-generated blacklists
2. Review manual blacklist appeals
3. Check for expired loan requests/offers
4. Monitor platform usage and performance

### Database Maintenance

The platform includes automatic expiration for:

- Loan requests: 30 days
- Loan offers: 7 days

Consider setting up a cron job to run the `expire_old_items()` function daily.

## Support

For issues or questions:

1. Check the error logs in Supabase
2. Verify RLS policies are not blocking access
3. Ensure all database migrations ran successfully
4. Check browser console for client-side errors
