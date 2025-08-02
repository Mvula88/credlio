# Country Restrictions Implementation Guide

## Overview

This implementation ensures users are restricted to their country throughout their experience in Credlio. Country is automatically detected from phone numbers (primary) or IP address (fallback) during signup and cannot be changed afterward.

## What Was Implemented

### 1. Phone Number Country Detection (`lib/utils/phone-country-detector.ts`)
- Detects country from phone number country codes
- Supports all 16 African countries in the system
- Validates phone number length per country
- Formats phone numbers with proper country codes

### 2. IP-Based Geolocation Fallback (`lib/services/ip-geolocation.ts`)
- Uses free geolocation APIs (ipapi.co and ip-api.com)
- Automatically detects country when phone detection fails
- Extracts IP from request headers in server actions

### 3. Updated Signup Flow
- **Removed country dropdown** - users can no longer manually select country
- **Auto-detects country** from phone number as they type
- Shows detected country in green when successful
- **Validates phone format** and shows specific error messages
- Lists supported countries at the bottom of the form

### 4. Database Constraints (`scripts/country_restrictions_setup.sql`)
- **Trigger prevents country_id changes** after registration
- Helper function `get_user_country_id()` for RLS policies
- Audit logging table for security monitoring

### 5. Row Level Security (RLS) Policies
Updated policies ensure:
- Lenders can only see borrowers from their country
- Loan requests are filtered by country
- Blacklist entries are country-specific
- All data access is restricted by country

### 6. Country Access Middleware (`lib/middleware/country-access.ts`)
- Checks if users can access specific country data
- Logs unauthorized access attempts
- Provides helper functions for API routes

### 7. Settings Page Updates
- Shows country with a lock icon indicating it cannot be changed
- Displays the full country name from the database

## Setup Instructions

### 1. Run the Database Scripts

First, run the country restrictions SQL script in your Supabase SQL Editor:

```sql
-- Run the script from: scripts/country_restrictions_setup.sql
```

This will:
- Create a trigger to prevent country changes
- Add country-based RLS policies
- Create helper functions
- Set up audit logging

### 2. Environment Setup

No additional environment variables are needed. The IP geolocation uses free services.

### 3. Testing

#### Test Phone Number Detection:
- Nigeria: +234 812 345 6789
- Kenya: +254 712 345 678
- Namibia: +264 81 234 5678
- South Africa: +27 82 123 4567

#### Test Country Restrictions:
1. Sign up as a lender in Nigeria
2. Try to view borrowers - you should only see Nigerian borrowers
3. Check that loan requests are filtered by country

## How It Works

### Signup Process:
1. User enters phone number
2. System detects country from phone code
3. If phone detection fails, IP geolocation is used
4. Country is validated against supported countries
5. Profile is created with permanent country_id

### Data Access:
1. All queries automatically filter by user's country
2. RLS policies enforce country restrictions at database level
3. API routes check country access before returning data
4. Cross-country access attempts are logged

## Security Features

### Implemented:
- ✅ Country cannot be changed after registration
- ✅ Phone number validation per country
- ✅ IP-based fallback detection
- ✅ RLS policies enforce country isolation
- ✅ Audit logging for security monitoring
- ✅ Clear error messages for unsupported countries

### Protection Against:
- Users changing country to access other markets
- Cross-country data leakage
- Manual country selection bypass
- Invalid phone number formats

## Supported Countries

The system supports these African countries:
- Nigeria (NG) - +234
- Kenya (KE) - +254
- Uganda (UG) - +256
- South Africa (ZA) - +27
- Ghana (GH) - +233
- Tanzania (TZ) - +255
- Rwanda (RW) - +250
- Zambia (ZM) - +260
- Namibia (NA) - +264
- Botswana (BW) - +267
- Malawi (MW) - +265
- Senegal (SN) - +221
- Ethiopia (ET) - +251
- Cameroon (CM) - +237
- Sierra Leone (SL) - +232
- Zimbabwe (ZW) - +263

## Error Handling

### User-Friendly Messages:
- "Invalid phone number format" - with example format
- "Country not supported" - when detected country isn't in system
- "Phone number length invalid" - with expected length
- "Could not detect country" - with instructions to include country code

### Fallback Strategy:
1. Try phone number detection first
2. If fails, try IP geolocation
3. If both fail, show clear error message
4. Never allow signup without valid country

## Monitoring

### Check Country Distribution:
```sql
SELECT 
    c.name as country,
    COUNT(p.id) as user_count,
    COUNT(CASE WHEN p.role = 'lender' THEN 1 END) as lenders,
    COUNT(CASE WHEN p.role = 'borrower' THEN 1 END) as borrowers
FROM profiles p
JOIN countries c ON c.id = p.country_id
GROUP BY c.id, c.name
ORDER BY user_count DESC;
```

### Monitor Access Attempts:
```sql
SELECT 
    cal.*,
    p.email as user_email,
    c1.name as user_country,
    c2.name as attempted_country
FROM country_access_logs cal
JOIN profiles p ON p.id = cal.user_id
LEFT JOIN countries c1 ON c1.id = cal.user_country_id
LEFT JOIN countries c2 ON c2.id = cal.attempted_country_id
WHERE cal.was_denied = true
ORDER BY cal.created_at DESC;
```

## Future Enhancements

Consider adding:
1. Phone number verification via SMS
2. VPN detection to prevent location spoofing
3. Country-specific phone number formatting
4. Support for users who move countries (with admin approval)
5. Country-specific compliance rules