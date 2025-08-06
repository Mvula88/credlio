# 🔐 Admin Access - Production Deployment Guide

## ⚠️ CONFIDENTIAL - DO NOT SHARE OR COMMIT TO REPO

This guide contains sensitive information about admin access in production.

## Current Development Access
- **URL:** `http://localhost:3000/sys-auth-2024`
- **Admin Key:** `CREDLIO-ADMIN-2024`
- **Requirements:** Email + Password + Email Verification

## Production Deployment Options

### Option 1: Hidden URL Path (Simplest)
```env
ADMIN_SECRET_ROUTE=internal-93847-secure
```
- Access: `https://credlio.com/internal-93847-secure`
- **Pros:** Easy to implement, no DNS changes
- **Cons:** Still on same domain

### Option 2: Subdomain (Recommended)
```env
ADMIN_SUBDOMAIN=admin.credlio.com
```
- Access: `https://admin.credlio.com`
- **Pros:** Complete separation, can add CloudFlare Access
- **Cons:** Requires DNS configuration

### Option 3: IP Whitelist (Most Secure)
```env
ADMIN_ALLOWED_IPS=41.76.168.176,102.89.33.234
```
- Only specified IPs can access admin portal
- Get your IP: https://whatismyipaddress.com

### Option 4: Custom Header (Advanced)
```env
ADMIN_HEADER_KEY=X-Admin-Access
ADMIN_HEADER_VALUE=secret-key-2024
```
- Requires browser extension or API client to add header

## 🚀 Production Setup Steps

### 1. Choose Your Security Method
Pick one or combine multiple methods above.

### 2. Update Environment Variables
In your production environment (Vercel/Netlify/etc):

```env
# Required
NEXT_PUBLIC_ADMIN_ACCESS_KEY=<generate-new-secure-key>
ADMIN_SECRET_ROUTE=<your-secret-path>

# Optional Security
ADMIN_ALLOWED_IPS=<your-ip-addresses>
ENABLE_2FA=true
```

### 3. Generate Secure Keys
```bash
# Generate admin access key
openssl rand -base64 32

# Example output: K7x3mN9pQ2wR5vT8yU1iO4aS6dF0gH3jL
```

### 4. DNS Configuration (If Using Subdomain)
Add CNAME record:
```
admin.credlio.com -> your-app.vercel.app
```

### 5. CloudFlare Configuration (Optional but Recommended)
1. Enable CloudFlare Access on admin subdomain
2. Set up email authentication
3. Add IP restrictions

## 🔒 Security Checklist

- [ ] Changed `ADMIN_SECRET_ROUTE` from default
- [ ] Generated new `NEXT_PUBLIC_ADMIN_ACCESS_KEY`
- [ ] Enabled email verification for admin accounts
- [ ] Set up IP whitelist (if applicable)
- [ ] Configured CloudFlare Access (if using subdomain)
- [ ] Tested admin access before going live
- [ ] Documented access URL in secure location
- [ ] Removed this file from production code

## 🚨 Important Security Notes

1. **Never commit real admin URLs or keys to Git**
2. **Never link to admin portal from public pages**
3. **Never mention admin portal in public documentation**
4. **Always use HTTPS in production**
5. **Monitor admin access logs regularly**

## 📊 Monitoring Admin Access

Check admin access logs in Supabase:
```sql
SELECT * FROM admin_access_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

## 🆘 Emergency Access Recovery

If locked out:
1. Access Supabase directly
2. Update user role in `profiles` table
3. Clear `admin_access_logs` if needed
4. Reset environment variables

## 🗝️ Access URLs by Environment

| Environment | URL | Status |
|------------|-----|--------|
| Development | http://localhost:3000/sys-auth-2024 | Active |
| Staging | https://staging.credlio.com/[SECRET] | Configure |
| Production | https://credlio.com/[SECRET] | Configure |

---

**Remember:** The security of your admin panel depends on keeping these details secret!