# Country Configuration Cleanup Guide

## Current Status
Your Credlio platform is configured to support exactly 16 African countries. The configuration files have been reviewed and cleaned up.

## The 16 Supported Countries

1. **Nigeria** (NG) - NGN - West Africa
2. **Kenya** (KE) - KES - East Africa  
3. **Uganda** (UG) - UGX - East Africa
4. **South Africa** (ZA) - ZAR - Southern Africa
5. **Ghana** (GH) - GHS - West Africa
6. **Tanzania** (TZ) - TZS - East Africa
7. **Rwanda** (RW) - RWF - East Africa
8. **Zambia** (ZM) - ZMW - Southern Africa
9. **Namibia** (NA) - NAD - Southern Africa
10. **Botswana** (BW) - BWP - Southern Africa
11. **Malawi** (MW) - MWK - Southern Africa
12. **Senegal** (SN) - XOF - West Africa
13. **Ethiopia** (ET) - ETB - East Africa
14. **Cameroon** (CM) - XAF - Central Africa
15. **Sierra Leone** (SL) - SLL - West Africa
16. **Zimbabwe** (ZW) - ZWL - Southern Africa

## Files Already Configured Correctly

✅ **`/lib/constants/countries.ts`** - Already contains exactly your 16 countries
✅ **`/scripts/SETUP_EXACT_16_COUNTRIES.sql`** - Already configured for your 16 countries

## Files to Avoid Using

These SQL scripts contain references to 54 African countries and should NOT be used:
- ❌ `/scripts/INSERT_ALL_54_COUNTRIES.sql`
- ❌ `/scripts/COMPLETE_AFRICA_SETUP.sql`

## Clean Setup Instructions

### For Fresh Database Setup
Run the new clean setup script:
```sql
-- In Supabase SQL Editor
-- Run: /scripts/SETUP_ONLY_16_COUNTRIES_CLEAN.sql
```

This script will:
1. Remove any countries not in your list
2. Clean up any references to removed countries
3. Insert/update only your 16 countries
4. Verify the setup

### For Existing Database
If your database already has data:
1. First backup your database
2. Run the `SETUP_ONLY_16_COUNTRIES_CLEAN.sql` script
3. This will safely remove extra countries while preserving data for your 16 countries

## Frontend Configuration
The frontend already uses the correct country list from `/lib/constants/countries.ts`. No changes needed there.

## Important Notes

- All country selection dropdowns will only show these 16 countries
- The geolocation features will restrict access to these countries only
- Currency support is configured for: NGN, KES, UGX, ZAR, GHS, TZS, RWF, ZMW, NAD, BWP, MWK, XOF, ETB, XAF, SLL, ZWL
- Two countries use shared currencies:
  - Senegal uses XOF (West African CFA franc)
  - Cameroon uses XAF (Central African CFA franc)

## Verification
To verify your setup, run this query in Supabase:
```sql
SELECT COUNT(*) as total_countries FROM public.countries;
-- Should return: 16
```