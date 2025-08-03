# Supabase Email Configuration with Resend

## Quick Setup (Using Supabase Auth)

With this setup, Supabase handles everything - token generation, email sending, password reset, and email confirmation. You just configure Resend as the SMTP provider.

### Step 1: Enable Email Confirmation

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Settings**
3. Enable **"Confirm email"** option
4. Save changes

### Step 2: Configure Resend SMTP in Supabase

1. Still in Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Click on **SMTP Settings** tab
4. Enable "Custom SMTP" and enter these Resend settings:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: re_APoptXqA_23X3XqPj13PWKcMekiyqf8zL (your API key)
Sender email: noreply@yourdomain.com (or use onboarding@resend.dev for testing)
Sender name: Credlio
```

### Step 3: Customize Email Templates (Optional)

In the same **Email Templates** section, you can customize:
- **Confirm signup** template (for email confirmation)
- **Reset Password** template
- **Magic Link** template

### Step 4: How It Works

1. **Email Confirmation Flow:**
   - User signs up on `/signup/lender` or `/signup/borrower`
   - Your app calls `supabase.auth.signUp()`
   - Supabase sends confirmation email via Resend SMTP
   - User sees "Check your email" message with username displayed
   - User clicks confirmation link in email
   - Account is activated, user can sign in

2. **Password Reset Flow:**
   - User enters username on `/auth/forgot-password`
   - Your API (`/api/auth/forgot-password/route.ts`) looks up the email
   - Calls `supabase.auth.resetPasswordForEmail(email)` 
   - Supabase generates token and sends email via Resend
   - User clicks link → Goes to `/auth/callback` → Redirects to `/auth/reset-password`
   - User enters new password using Supabase's session

3. **Username Recovery Flow:**
   - User enters email on `/auth/forgot-username`
   - Your API sends email directly using Resend (custom logic)

## What Supabase Handles vs What You Handle

| Feature | Supabase Handles | You Handle |
|---------|-----------------|------------|
| Email confirmation | ✅ | ❌ |
| Generate reset token | ✅ | ❌ |
| Store token securely | ✅ | ❌ |
| Send confirmation email | ✅ (via Resend SMTP) | ❌ |
| Send password reset email | ✅ (via Resend SMTP) | ❌ |
| Validate tokens | ✅ | ❌ |
| Update password | ✅ | ❌ |
| Username recovery | ❌ | ✅ (custom) |
| Resend confirmation | ✅ | ✅ (trigger) |

## Testing

1. Start your dev server: `npm run dev`
2. Go to `/auth/forgot-password`
3. Enter a username
4. Check the email for reset link
5. Click link and reset password

## Production Checklist

- [ ] Verify domain in Resend dashboard for better deliverability
- [ ] Update `EMAIL_FROM` in `.env.local` to use your domain
- [ ] Test email delivery in production
- [ ] Monitor Resend dashboard for bounces/complaints

## Troubleshooting

**Emails not sending?**
- Check Resend API key is correct in Supabase SMTP settings
- Verify sender email is allowed in Resend

**Reset links not working?**
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly in `.env.local`
- Check `/auth/callback/route.ts` is handling the redirect properly

**Custom domain emails?**
1. Add domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Wait for verification
4. Update `EMAIL_FROM` to use your domain