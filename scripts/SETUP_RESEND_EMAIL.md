# Setting Up Resend Email for Supabase Authentication

## Prerequisites
You already have:
- Resend API key in `.env.local`: `re_AP6jTmGY_KvYf2hRRMcYsMP92mEM5dbxx`
- Email from address: `no-reply@send.credlio.com`

## Step 1: Configure Supabase to Use Resend

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/aysewmjjenwpqvzsueqd

2. Navigate to **Settings** → **Auth**

3. Scroll down to **Email Configuration** section

4. Configure the following:

### SMTP Settings:
- **Enable Custom SMTP**: Toggle ON
- **Sender email**: `no-reply@send.credlio.com`
- **Sender name**: `Credlio`
- **Host**: `smtp.resend.com`
- **Port**: `587`
- **Username**: `resend`
- **Password**: `re_AP6jTmGY_KvYf2hRRMcYsMP92mEM5dbxx`
- **Secure connection**: TLS (leave as default)

5. Click **Save**

## Step 2: Configure Email Templates (Optional but Recommended)

While still in **Settings** → **Auth**, scroll to **Email Templates**:

### Confirmation Email Template:
```html
<h2>Confirm your email</h2>

<p>Hi {{ .Email }},</p>

<p>Thank you for signing up for Credlio! Please confirm your email address by clicking the link below:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>

<p>Or copy and paste this link: {{ .ConfirmationURL }}</p>

<p>This link will expire in 24 hours.</p>

<p>If you didn't create an account with Credlio, you can safely ignore this email.</p>

<p>Best regards,<br>The Credlio Team</p>
```

### Magic Link Template:
```html
<h2>Your Magic Link</h2>

<p>Hi {{ .Email }},</p>

<p>Click the link below to sign in to your Credlio account:</p>

<p><a href="{{ .ConfirmationURL }}">Sign in to Credlio</a></p>

<p>Or copy and paste this link: {{ .ConfirmationURL }}</p>

<p>This link will expire in 60 minutes.</p>

<p>If you didn't request this email, you can safely ignore it.</p>

<p>Best regards,<br>The Credlio Team</p>
```

### Password Reset Template:
```html
<h2>Reset your password</h2>

<p>Hi {{ .Email }},</p>

<p>We received a request to reset your password. Click the link below to create a new password:</p>

<p><a href="{{ .ConfirmationURL }}">Reset your password</a></p>

<p>Or copy and paste this link: {{ .ConfirmationURL }}</p>

<p>This link will expire in 60 minutes.</p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>

<p>Best regards,<br>The Credlio Team</p>
```

## Step 3: Configure Auth Settings

Still in **Settings** → **Auth**:

1. Under **User Signups**:
   - **Enable email confirmations**: ON
   - **Enable new user signups**: ON

2. Under **Email Auth**:
   - **Enable Email Signup**: ON
   - **Confirm email**: ON (Require users to confirm their email address)
   - **Secure email change**: ON
   - **Secure password update**: ON

3. Under **Site URL**:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add these URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000`
     - `http://localhost:3000/auth/signin`

## Step 4: Test Email Configuration

1. In Supabase Dashboard, go to **Settings** → **Auth**
2. Click **Send Test Email** button in the SMTP section
3. Enter your email address and send a test

If the test email arrives, Resend is configured correctly!

## Step 5: Update Database Policies (Already Done)

The following policies are already in place:
- Profiles table INSERT policy for authenticated users
- Auth trigger to create profile on signup

## Step 6: Common Issues and Solutions

### Issue: "Database error saving new user"
**Solution**: The code has been updated to handle profile creation more robustly with retry logic.

### Issue: Email not being sent
**Solutions**:
1. Check that SMTP settings are saved in Supabase
2. Verify Resend API key is active
3. Check Resend dashboard for any bounced emails

### Issue: User already exists
**Solution**: Clear the existing user from both auth.users and profiles tables:

```sql
-- Replace with the actual email
DELETE FROM auth.users WHERE email = 'user@example.com';
DELETE FROM profiles WHERE email = 'user@example.com';
```

## Step 7: Production Setup

When moving to production:

1. Update Site URL to your production domain
2. Update Redirect URLs to use production domain
3. Consider using a custom domain for emails (requires DNS configuration in Resend)
4. Set up SPF, DKIM, and DMARC records for better deliverability

## Verification

After setup, test the signup flow:

1. Go to `/auth/signup`
2. Choose account type (Lender or Borrower)
3. Fill in the form
4. Submit
5. Check email for confirmation link
6. Click the link to confirm
7. Sign in with email and password

The signup should now work without database errors, and emails should be sent via Resend!