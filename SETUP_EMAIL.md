# Email Setup Guide for Credlio

## Recommended: Resend Setup

### 1. Sign up at https://resend.com
- Create free account
- Get your API key

### 2. Install Resend
```bash
npm install resend
```

### 3. Add to .env.local
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Update the email service
The code is already prepared in `/lib/email/send-email.ts`
Just uncomment the Resend section and update the API routes.

### 5. Verify your domain (for production)
- Add DNS records from Resend dashboard
- Improves deliverability

## Alternative: Use Supabase Email (Quickest)

If you want the quickest solution without external services:

1. Go to Supabase Dashboard > Authentication > Email Templates
2. Customize the templates for:
   - Password Reset
   - Magic Link

3. Enable "Custom SMTP" in Supabase Dashboard if you want better deliverability

This uses Supabase's built-in email, but has limitations:
- Basic templates only
- Limited customization
- Lower sending limits

## Testing Emails Locally

For development, you can use:
- **Mailtrap**: Catches all emails in development
- **Console logging**: Current setup logs to console

## Production Checklist
- [ ] Domain verified (SPF, DKIM records)
- [ ] "From" email uses your domain
- [ ] Unsubscribe links in marketing emails
- [ ] Privacy policy mentions email usage
- [ ] Rate limiting on recovery endpoints