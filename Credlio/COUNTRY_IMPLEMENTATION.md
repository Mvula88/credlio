# Country-Based Implementation Guide

## Overview

This document outlines the complete country-based implementation for the Credlio platform, including multi-country support, IP geolocation, Stripe subscriptions, and country admin functionality.

## Supported Countries

The platform supports 16 African countries:

- Nigeria (NG) 🇳🇬
- Kenya (KE) 🇰🇪
- Uganda (UG) 🇺🇬
- South Africa (ZA) 🇿🇦
- Ghana (GH) 🇬🇭
- Tanzania (TZ) 🇹🇿
- Rwanda (RW) 🇷🇼
- Zambia (ZM) 🇿🇲
- Namibia (NA) 🇳🇦
- Botswana (BW) 🇧🇼
- Malawi (MW) 🇲🇼
- Senegal (SN) 🇸🇳
- Ethiopia (ET) 🇪🇹
- Cameroon (CM) 🇨🇲
- Sierra Leone (SL) 🇸🇱
- Zimbabwe (ZW) 🇿🇼

## Key Features Implemented

### 1. Country-Based Access Control

- Users can only view and interact with data from their own country
- Country selection required during onboarding
- Automatic country detection via IP geolocation
- Travel detection and notifications

### 2. Role-Based Access

- **Borrowers**: Can create loan requests, view their reputation
- **Lenders**: Can subscribe, view marketplace, make offers (with subscription)
- **Country Admins**: Can manage users and data for assigned countries
- **Super Admins**: Full access to all countries and platform management

### 3. Stripe Subscription System

- Two tiers: Basic ($15/month) and Premium ($22/month)
- 1-day free trial
- Country-specific pricing support
- Webhook integration for real-time updates
- Features:
  - Basic: Reputation reports, blacklist access, affordability calculator (10 reports/month)
  - Premium: All Basic features + marketplace access, unlimited reports, smart matching

### 4. Database Implementation

- Row Level Security (RLS) policies for country-based filtering
- Automatic country propagation to related records
- Performance indexes for efficient queries
- Scheduled tasks for:
  - Overdue loan checking
  - Reputation score updates
  - Daily statistics generation

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# IPinfo (optional for production)
IPINFO_TOKEN=your_token_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 2. Database Setup

Run the scripts in order:

```sql
-- In Supabase SQL editor, run:
\i scripts/50_country_support_schema.sql
\i scripts/51_country_based_rls.sql
\i scripts/52_country_functions.sql
\i scripts/53_stripe_integration.sql
\i scripts/54_helper_functions.sql
\i scripts/55_auto_update_functions.sql
\i scripts/56_performance_indexes.sql

-- Or run the combined script:
\i scripts/apply_all_country_updates.sql
```

### 3. Stripe Setup

1. Create products and prices in Stripe Dashboard
2. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Configure webhook to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

### 4. Scheduled Tasks (Optional)

Enable pg_cron extension and schedule daily tasks:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-credlio-tasks',
  '0 2 * * *', -- Run at 2 AM daily
  $$SELECT run_scheduled_tasks();$$
);
```

## API Endpoints

### Geolocation

- `GET /api/geolocation` - Detect user's country from IP

### Subscriptions

- `POST /api/subscriptions/checkout` - Create Stripe checkout session
- `POST /api/subscriptions/portal` - Create customer portal session
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## Frontend Components

### Country Components

- `CountryInfoBadge` - Display country information
- `TravelBanner` - Show travel notification
- `CountrySelector` - Country selection UI
- `SubscriptionPlans` - Subscription tier selection

### Hooks

- `useCountryAccess` - Manage country-based permissions
- `useCountryFilter` - Filter data by country
- `useSubscriptionAccess` - Check subscription features

### Pages

- `/auth/select-country` - Initial country selection
- `/lender/subscription` - Subscription management
- `/admin/country` - Country admin dashboard
- `/super-admin/dashboard` - Super admin dashboard

## Country-Based Features

### For All Users

- Country-specific currency display
- Localized content based on country
- Travel detection and notifications

### For Lenders

- Country-filtered marketplace
- Local borrower matching
- Country-specific subscription pricing

### For Admins

- Country-level statistics
- User management by country
- Revenue tracking per country

## Security Considerations

1. **RLS Policies**: All tables have country-based RLS policies
2. **IP Tracking**: User IPs are logged for security and country detection
3. **Travel Detection**: System detects when users access from different countries
4. **Admin Access**: Multi-level admin system with proper access controls

## Testing

### Test Country Selection

1. Sign up as new user
2. Should redirect to `/auth/select-country`
3. Select country and continue
4. Verify country badge appears in header

### Test Subscription Flow

1. Sign in as lender
2. Navigate to `/lender/subscription`
3. Select plan and subscribe
4. Verify 1-day trial starts
5. Check subscription status

### Test Country Filtering

1. Create data in different countries
2. Verify users only see their country's data
3. Test admin access to multiple countries

## Maintenance

### Daily Tasks

- Reputation scores are updated automatically
- Overdue loans are checked and flagged
- Country statistics are generated

### Monthly Tasks

- Review subscription metrics
- Check country-specific performance
- Update currency exchange rates if needed

## Future Enhancements

1. **Mobile Money Integration**: Add country-specific payment methods
2. **SMS Notifications**: Country-specific SMS providers
3. **Language Support**: Add local language translations
4. **Regulatory Compliance**: Country-specific lending regulations
5. **Credit Bureau Integration**: Connect to local credit bureaus
