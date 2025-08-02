# Credlio Setup Guide

## Prerequisites
- Node.js 18.17.0 or higher
- Supabase account and project
- Stripe account (for payment processing)

## Step 1: Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your actual credentials:
   - **Supabase credentials**: Get from Supabase Dashboard → Settings → API
   - **Stripe credentials**: Get from Stripe Dashboard → Developers → API keys

## Step 2: Database Setup

Run the SQL scripts in your Supabase SQL editor in this exact order:

1. **COMPLETE_CREDLIO_SETUP.sql** - Creates all base tables and policies
2. **cleanup_and_fix_risky_borrower.sql** - Sets up borrower risk tracking
3. **add_lender_borrower_relationships.sql** - Adds lender-borrower features

All scripts are located in `Credlio/scripts/`

## Step 3: Enable Realtime (Optional)

In Supabase Dashboard → Database → Tables, enable realtime for:
- profiles
- loan_requests
- loan_offers
- notifications
- active_loans

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Features Added

### Profile Management
- ✅ Borrower profile page with:
  - Personal information display and editing
  - Reputation score visualization
  - Badge display
  - Account management (sign out, delete account)
  
- ✅ Lender profile page with:
  - Business information display and editing
  - Subscription status
  - Stats overview
  - Account management

### Dashboard Integration
- Profile tabs added to both borrower and lender dashboards
- Seamless navigation between dashboard sections

## Troubleshooting

### Missing environment variables
- Check that all required variables in `.env.local.example` are set in your `.env.local`

### Database errors
- Ensure all SQL scripts were run in the correct order
- Check Supabase logs for any RLS policy issues

### Stripe errors
- Verify your Stripe API keys are correct
- Ensure price IDs match your Stripe products

## Next Steps

1. Configure your Stripe products and prices
2. Test user registration and login flows
3. Verify profile editing functionality
4. Test subscription flows for lenders