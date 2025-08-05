# Supabase OTP Email Setup Guide

This guide will help you configure Supabase to send 6-digit OTP codes instead of magic links in authentication emails.

## Quick Setup (2 Methods)

### Method 1: Using SQL Script (Recommended)

1. **Run the SQL Script**
   - Go to your Supabase Dashboard → SQL Editor
   - Copy and run the entire contents of `scripts/enable_otp_instead_of_magic_link.sql`
   - This script will:
     - Configure authentication settings
     - Update email templates to show 6-digit codes
     - Hide magic links while maintaining compatibility

### Method 2: Manual Setup via Dashboard

1. **Navigate to Email Templates**
   - Go to Supabase Dashboard → Authentication → Email Templates

2. **Update the "Magic Link" Template**
   - Find the "Magic Link" email template
   - Copy the contents from `supabase_otp_email_template.html`
   - Paste it into the template editor
   - Save the changes

3. **Key Template Feature**
   - The template uses `{{ .Token | slice 0 6 }}` to display only the first 6 characters of the token
   - The full magic link is hidden but remains in the email for compatibility

## How It Works

- Supabase's `signInWithOtp` always generates a magic link URL
- Our email template extracts the first 6 characters of the token to display as an OTP
- Users see and enter a 6-digit code instead of clicking a link
- The application already has OTP verification UI ready (see `components/auth/otp-verification.tsx`)

## Testing the Setup

1. **Sign up or sign in** with a test account
2. **Check your email** - you should see a 6-digit code prominently displayed
3. **Enter the code** in the OTP verification screen
4. **Verify** that authentication completes successfully

## Email Template Preview

The email will display:
- A professional header with "Credlio" branding
- A large, easy-to-read 6-digit code in a blue gradient box
- Clear instructions for the user
- Expiration time (60 minutes)
- Security notice at the bottom

## Troubleshooting

- **Still seeing magic links?** Make sure you've updated the correct template ("Magic Link" not "Confirmation")
- **Code not working?** Ensure you're copying the exact 6 digits shown in the email
- **Email not arriving?** Check spam folder and Supabase email settings

## Important Notes

- This is not a "true" OTP system but provides the user experience of one
- The magic link URL is still generated but hidden from view
- For a true OTP system, you would need custom auth flows or third-party services
- The current implementation works well for most use cases and maintains Supabase compatibility