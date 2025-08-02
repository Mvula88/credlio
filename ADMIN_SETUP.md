# Admin User Setup Instructions

Follow these steps to create your admin user in Credlio:

## Step 1: Create User in Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter:
   - Email: `your-admin-email@example.com`
   - Password: `your-secure-password`
   - Check "Auto Confirm Email" to skip email verification
5. Click **Create user**
6. Copy the generated User ID (UUID)

## Step 2: Run Database Migration

1. First, run the migration to add the role column:
   ```sql
   -- Run the file: scripts/25_add_role_to_profiles.sql
   ```

## Step 3: Create Admin Profile

1. Open the file `scripts/26_create_admin_user.sql`
2. Replace the placeholder values:
   - `YOUR_ADMIN_AUTH_USER_ID` → The UUID you copied from Step 1
   - `YOUR_EMAIL` → Your admin email
   - `YOUR_NAME` → Your full name
   - `YOUR_PHONE` → Your phone number (or NULL)
   - `YOUR_COUNTRY_CODE` → Your country code (e.g., 'NA' for Namibia)

3. Run the SQL script in Supabase SQL Editor

Example:

```sql
INSERT INTO profiles (
  auth_user_id,
  email,
  full_name,
  phone_number,
  country,
  role,
  is_verified,
  created_at,
  updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', -- Your actual UUID
  'admin@credlio.com',
  'John Doe',
  '+264812345678',
  'NA',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (auth_user_id)
DO UPDATE SET
  role = 'admin',
  is_verified = true,
  updated_at = NOW();
```

## Step 4: Verify Admin Access

1. Go to `/auth/signin`
2. Sign in with your admin credentials
3. You should be redirected to `/admin/dashboard`
4. You can access:
   - `/admin/dashboard` - Main admin dashboard
   - `/admin/global-dashboard` - Global admin view
   - `/super-admin` - Super admin panel
   - `/personal-admin` - Personal admin view

## Admin Capabilities

As an admin, you can:

- Access all admin-only routes
- View and manage users across all countries
- Access audit logs and system statistics
- Manage country-specific settings
- View all loans and payments

## Security Notes

- Admin accounts should only be created manually through the database
- Never expose admin creation through the UI
- Use strong passwords for admin accounts
- Enable 2FA for admin accounts when available
- Regularly audit admin access logs
