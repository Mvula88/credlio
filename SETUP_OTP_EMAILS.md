# Setup OTP Email Template in Supabase

To get 6-digit OTP codes instead of magic links, follow these steps:

## Method 1: Quick Dashboard Setup (Recommended)

### 1. Go to Supabase Dashboard
- Navigate to **Authentication > Email Templates**
- Select the **"Magic Link"** template

### 2. Replace the template content
Copy the entire contents of `supabase_otp_email_template.html` and paste it into the template editor.

Or use this template:

```html
<h2>Your Credlio Verification Code</h2>

<p>Hi there,</p>

<p>Your verification code is:</p>

<div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
  <h1 style="font-size: 36px; font-weight: bold; letter-spacing: 10px; margin: 0; font-family: monospace;">
    {{ .Token | slice 0 6 }}
  </h1>
</div>

<p>This code will expire in 1 hour.</p>

<p>Enter this code in the Credlio app to complete your sign in.</p>

<p style="color: #6b7280; font-size: 14px;">
  If you didn't request this code, you can safely ignore this email.
</p>

<!-- Hide the actual link but keep it for fallback -->
<div style="display: none;">
  <p>Or click here to sign in directly: <a href="{{ .ConfirmationURL }}">Sign in to Credlio</a></p>
</div>
```

### 3. Save the template
Click **Save** to apply the changes.

## Method 2: Using SQL Script

If you want to set up additional helper functions:

1. Run `scripts/setup_otp_email_template.sql` in your Supabase SQL Editor
2. This creates a helper function for OTP extraction
3. Follow the instructions displayed in the SQL output

## Important Notes

- **Supabase Limitation**: Supabase's `signInWithOtp` always generates a magic link URL
- **Our Solution**: The email template uses `{{ .Token | slice 0 6 }}` to display only the first 6 characters as an OTP
- **User Experience**: Users see and enter a 6-digit code instead of clicking a link
- **App Ready**: Your app already has OTP verification UI implemented!

## What the Email Looks Like

- Professional Credlio branding
- Large, easy-to-read 6-digit code in a blue gradient box
- Clear instructions for users
- 60-minute expiration notice
- Hidden magic link for compatibility

## Testing

1. Sign in with a test account
2. Check your email for the new OTP format
3. Enter the 6-digit code in the app
4. Verify successful authentication

## Troubleshooting

- **Still seeing magic links?** Make sure you updated the "Magic Link" template, not "Confirmation"
- **Template not saving?** Check for any syntax errors in the HTML
- **Emails not arriving?** Check spam folder and Supabase email settings