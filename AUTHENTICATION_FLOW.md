# Authentication Flow Documentation

## Overview
This document describes the complete authentication flow for Credlio, including sign up, sign in, country selection, and session management.

## Authentication Flow

### 1. Sign Up Process
1. User navigates to `/auth/signup` and chooses their role (Lender/Borrower)
2. Redirected to role-specific signup page (`/signup/lender` or `/signup/borrower`)
3. User fills out the registration form with:
   - Full Name
   - Email
   - Phone Number
   - Password
   - ID Type & Number
   - Date of Birth
   - Country Selection
4. Upon successful registration:
   - A unique Customer ID is generated and displayed (ONE TIME ONLY)
   - User is prompted to save their Customer ID
   - Email confirmation is sent via Supabase/Resend
   - User is shown the email confirmation screen
   - "Go to Sign In" button is available to proceed to login

### 2. Email Confirmation
- User clicks the confirmation link in their email
- Link redirects to `/auth/callback` which verifies the email
- User is then redirected to sign in page with success message

### 3. Sign In Process
1. User navigates to `/auth/signin`
2. Enters email and password
3. System performs:
   - Device fingerprinting for security
   - Account lock check (after 3 failed attempts)
   - Authentication via Supabase
4. Upon successful authentication:
   - If first-time login or no country selected → Redirect to `/auth/select-country`
   - Otherwise → Redirect to role-specific dashboard

### 4. Country Selection
- **Required for:** First-time users or users without a country set
- **Page:** `/auth/select-country`
- **Features:**
  - Automatic country detection via geolocation
  - Grid of available countries with flags
  - Selection persists to user profile
  - After selection → Redirect to appropriate dashboard

### 5. Navigation Bar Behavior

#### When NOT Authenticated:
- Shows "Sign In" dropdown button
- Shows "Sign Up" dropdown button
- Both buttons lead to authentication pages

#### When Authenticated:
- Sign In/Sign Up buttons are hidden
- User menu appears with:
  - User's name or email
  - Dashboard link
  - Settings link
  - Sign Out option
  - Role-specific admin links (if applicable)
- Country badge displayed (if country is set)

### 6. Protected Routes
The middleware (`middleware.ts`) enforces:
- Authentication required for:
  - `/dashboard`
  - `/borrower/*`
  - `/lender/*`
  - `/admin/*`
  - `/settings`
  - `/profile`
- Country selection required before accessing protected routes
- Role-based access control
- Location verification for security

### 7. Sign Out Process
- Available from:
  - Header dropdown menu
  - Settings page (`/settings`)
- Clears session and redirects to sign in page

## Security Features

### Device Fingerprinting
- Tracks trusted devices
- Requires additional verification for new devices

### Account Protection
- Account locks after 3 failed login attempts
- 1-hour lockout period
- Failed attempt tracking

### Location Verification
- Verifies user location matches registered country
- Blocks access from suspicious locations
- Travel mode for legitimate country changes

## Database Requirements

### Required Tables
- `profiles` - User profiles with country, role, etc.
- `countries` - List of available countries with flags
- `user_devices` - Trusted device tracking
- `identity_verifications` - ID verification records

### SQL Setup
Run these scripts in order:
1. `add_all_countries.sql` - Adds supported countries
2. `ensure_countries_with_flags.sql` - Adds flag emojis
3. `COMPLETE_CREDLIO_SETUP.sql` - Full database setup

## Troubleshooting

### Country Selection Page Shows No Countries
1. Run `ensure_countries_with_flags.sql` in Supabase SQL editor
2. Verify `countries` table has `active = true` for countries
3. Check browser console for API errors

### Sign Up/Sign In Buttons Still Showing When Logged In
1. Clear browser cache and cookies
2. Check if AuthProvider is wrapping the app in `layout.tsx`
3. Verify `useAuth` hook is properly imported in Header

### Country Selection Not Redirecting
1. Check if profile update is successful in browser console
2. Verify middleware is not blocking the redirect
3. Ensure `country_id` is properly set in profiles table

## Testing the Flow

1. **New User Registration:**
   ```
   1. Go to /auth/signup
   2. Select role (Lender/Borrower)
   3. Fill form and submit
   4. Save Customer ID when shown
   5. Check email for confirmation
   6. Click confirmation link
   7. Sign in with email/password
   8. Select country
   9. Verify dashboard access
   ```

2. **Existing User Login:**
   ```
   1. Go to /auth/signin
   2. Enter credentials
   3. Should go directly to dashboard
   4. Verify user menu in header
   5. Test sign out functionality
   ```

## Best Practices

1. Always save the Customer ID shown after registration
2. Use the same email for all authentication
3. Select your actual country for proper service
4. Keep your account secure with strong passwords
5. Sign out when using shared devices