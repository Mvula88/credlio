# Fix for Supabase Email Verification

## Quick Solution

Since the SQL script references tables that don't exist in the current Supabase setup, follow these manual steps:

### 1. Configure Email Templates in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://aysewmjjenwpqvzsueqd.supabase.co)
2. Navigate to **Authentication** → **Email Templates**
3. Find the **Magic Link** template
4. Replace the template content with the following:

```html
<h2>Your verification code</h2>
<p>Enter this code to sign in to Credlio:</p>
<h1 style="font-size: 32px; font-family: monospace; letter-spacing: 4px; text-align: center; background: #f3f4f6; padding: 20px; border-radius: 8px;">{{ .Token }}</h1>
<p>This code will expire in 60 minutes.</p>
<p>If you didn't request this code, please ignore this email.</p>
```

### 2. Alternative: Use Default Supabase Magic Links

If email templates aren't working, the application already handles magic links. The error might be due to:

1. **Email service not configured in Supabase**
2. **Rate limiting** (too many attempts)
3. **Email domain not verified**

### 3. Check Supabase Email Settings

1. Go to **Project Settings** → **Authentication**
2. Ensure **Enable Email Signup** is ON
3. Check if you have custom SMTP settings or using default Supabase email service
4. For production, you might need to configure custom SMTP

### 4. Temporary Workaround

If emails aren't sending, you can:
1. Check the **Authentication** → **Users** tab in Supabase
2. Look for any new user entries when attempting signup
3. Check Supabase logs for email sending errors

### 5. Test with a Different Email

Sometimes email providers block automated emails. Try:
- Using a Gmail address
- Checking spam/junk folders
- Using a different email provider

The application code is correctly set up to handle OTP verification. The issue is with Supabase email configuration.