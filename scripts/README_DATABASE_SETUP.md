# Credlio Database Setup - Complete Guide

This directory contains all the SQL scripts and tools needed to set up the complete Credlio credit bureau database.

## 🎯 Quick Start

### Method 1: Automated Setup (Recommended)

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the automated setup
npm run db:setup
# or
ts-node scripts/run-master-setup.ts
```

### Method 2: Manual Setup

1. Copy the contents of `MASTER_DATABASE_SETUP.sql`
2. Paste into your Supabase SQL Editor
3. Execute the script
4. Run `VERIFY_DATABASE_SETUP.sql` to check everything was created

## 📁 File Structure

```
scripts/
├── MASTER_DATABASE_SETUP.sql           # Complete database setup (ALL IN ONE)
├── VERIFY_DATABASE_SETUP.sql           # Verification and health check
├── DATABASE_SETUP_GUIDE.md             # Detailed setup documentation
├── README_DATABASE_SETUP.md            # This file
├── run-master-setup.ts                 # Automated setup script
└── [legacy scripts]/                   # Historical setup scripts (for reference)
```

## 🗃️ Database Schema Overview

The master setup creates **29 core tables** organized into these categories:

### 🔐 User Management (5 tables)
- `countries` - Supported countries and currencies
- `user_roles` - Role definitions (borrower, lender, admin, etc.)
- `profiles` - User profiles and basic information
- `user_profile_roles` - Many-to-many role assignments
- `country_admins` - Country-specific administrators

### 💰 Loan System (4 tables)
- `loan_requests` - Borrower loan requests
- `loan_offers` - Lender offers on requests
- `active_loans` - Active loan agreements (when offers accepted)
- `loan_payments` - Payment tracking and history

### ⚠️ Risk Management (5 tables)
- `blacklisted_borrowers` - Platform blacklist with evidence
- `off_platform_defaulters` - External default reports
- `ghost_borrowers` - Offline borrower tracking
- `ghost_loans` - Offline loan tracking
- `borrower_risk_history` - Risk status change history

### 💬 Communication (3 tables)
- `conversations` - Direct messaging between users
- `messages` - Individual messages with read status
- `message_attachments` - File attachments support

### 🔔 Notifications & Invitations (2 tables)
- `notifications` - System notifications
- `borrower_invitations` - Lender invitations to borrowers

### 💳 Subscription System (2 tables)
- `subscription_plans` - Available subscription tiers
- `user_subscriptions` - User subscription status and billing

### 📊 Analytics & Tracking (4 tables)
- `watchlist` - Lender borrower watchlist
- `smart_tags` - AI-driven insights and tags
- `reputation_badges` - Achievement and reputation system
- `audit_logs` - Complete audit trail

### 🛡️ Security & Access Control (3 tables)
- `blocked_access_attempts` - Failed access attempts log
- `location_verification_logs` - Geographic access control
- `setup_log` - Database setup tracking

## 🔒 Security Features

### Row Level Security (RLS)
Every sensitive table has comprehensive RLS policies:

- **Profiles**: Users see only their own data + admin exceptions
- **Loans**: Parties see only their loans + subscription-based access for lenders
- **Blacklist**: Subscription-based access for lenders, own entries for borrowers
- **Messages**: Conversation participants only
- **Payments**: Loan parties only
- **Country-based access**: Data segregated by country where appropriate

### Key Security Patterns
```sql
-- Example: Borrowers can only see their own loan requests
CREATE POLICY "Borrowers manage own requests" ON loan_requests
  FOR ALL USING (
    borrower_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Example: Lenders need active subscription to view borrower data
CREATE POLICY "Subscribed lenders view borrowers" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_subscriptions us ON us.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
      AND us.status = 'active'
      AND us.current_period_end > NOW()
    )
  );
```

## 📈 Sample Data Included

The setup automatically creates:

### Countries (16 African Markets)
- Nigeria (NGN), Kenya (KES), Uganda (UGX), South Africa (ZAR)
- Ghana (GHS), Tanzania (TZS), Rwanda (RWF), Zambia (ZMW)
- Namibia (NAD), Botswana (BWP), Malawi (MWK), Senegal (XOF)
- Ethiopia (ETB), Cameroon (XAF), Sierra Leone (SLL), Zimbabwe (ZWL)

### User Roles
- `borrower` - Create loan requests, view own credit profile
- `lender` - Access credit reports, make offers (requires subscription)
- `admin` - Platform administration
- `country_admin` - Country-specific administration
- `super_admin` - Global super administration

### Subscription Plans
- **Basic ($15/month)**: 10 reports, blacklist access, risk assessment
- **Premium ($22/month)**: Unlimited reports, all features, priority support

## 🔧 Advanced Features

### Automated Triggers
- **Profile creation**: Auto-create profile when user signs up
- **Loan activation**: Auto-create active loan when offer accepted
- **Message tracking**: Auto-update conversation metadata
- **Payment processing**: Auto-update loan status on payments

### Utility Functions
- `handle_new_user()` - Process new user registration
- `create_active_loan_from_offer()` - Convert accepted offers to active loans
- `update_conversation_on_message()` - Maintain chat metadata
- `check_overdue_ghost_loans()` - Mark overdue offline loans

### Performance Optimizations
- **Strategic indexes**: 25+ indexes on frequently queried columns
- **Materialized views**: For complex analytics queries
- **Optimized constraints**: Proper foreign keys and check constraints
- **Query optimization**: Indexes on join columns and filter conditions

## 🚀 Post-Setup Tasks

### 1. Verify Installation
```sql
-- Run the verification script
\i VERIFY_DATABASE_SETUP.sql

-- Should show:
-- ✓ 29+ tables created
-- ✓ RLS enabled on sensitive tables
-- ✓ 40+ policies created
-- ✓ 25+ indexes created
-- ✓ Sample data populated
```

### 2. Create First Admin User
```sql
-- This should be done via your application's signup flow
-- Then assign admin role:
INSERT INTO user_profile_roles (profile_id, role_id)
SELECT p.id, ur.id
FROM profiles p, user_roles ur
WHERE p.email = 'admin@credlio.com'
AND ur.name = 'super_admin';
```

### 3. Configure Application
```typescript
// Ensure these environment variables are set:
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

### 4. Test Key Flows
- User registration → Profile creation → Role assignment
- Loan request → Offer → Acceptance → Active loan
- Payment recording → Status updates
- Blacklist reporting → Risk assessment
- Subscription → Access control

## 🔍 Troubleshooting

### Common Issues

**RLS Permission Denied**
```sql
-- Check user's roles
SELECT p.email, ur.name as role
FROM profiles p
JOIN user_profile_roles upr ON p.id = upr.profile_id
JOIN user_roles ur ON upr.role_id = ur.id
WHERE p.auth_user_id = auth.uid();

-- Check policy existence
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

**Foreign Key Violations**
```sql
-- Check referential integrity
SELECT conname, conrelid::regclass as table, confrelid::regclass as references
FROM pg_constraint
WHERE contype = 'f' AND confrelid::regclass::text = 'your_table';
```

**Missing Indexes**
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM your_table WHERE condition;

-- Create missing indexes
CREATE INDEX idx_table_column ON your_table(column);
```

### Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read + idx_tup_fetch DESC;
```

## 📊 Monitoring & Maintenance

### Daily Tasks
```sql
-- Check for overdue loans
SELECT check_overdue_ghost_loans();

-- Monitor system health
SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Weekly Tasks
- Review subscription metrics
- Analyze loan performance
- Check risk management effectiveness
- Monitor user growth and engagement

### Monthly Tasks
- Performance optimization review
- Security audit
- Backup verification
- Capacity planning

## 🔄 Schema Updates

When updating the schema:

1. **Create migration script** following naming convention: `YYYY-MM-DD_description.sql`
2. **Test in development** environment first
3. **Run verification** after changes
4. **Update TypeScript types** in `lib/types/database.ts`
5. **Update documentation** as needed

### Example Migration
```sql
-- 2024-12-07_add_borrower_score.sql
ALTER TABLE profiles ADD COLUMN credit_score INTEGER DEFAULT 0;
CREATE INDEX idx_profiles_credit_score ON profiles(credit_score);

-- Update RLS policies if needed
CREATE POLICY "Users can view own credit score" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);
```

## 🤝 Contributing

When contributing to the database schema:

1. Follow the existing naming conventions
2. Add appropriate RLS policies for new tables
3. Include proper indexes for query performance
4. Update the verification script
5. Document changes in this README
6. Test with sample data

## 📞 Support

For database-related issues:

1. **Check the verification script** - Run `VERIFY_DATABASE_SETUP.sql`
2. **Review audit logs** - Check `audit_logs` table for recent changes
3. **Validate configuration** - Ensure environment variables are correct
4. **Test RLS policies** - Verify policies work as expected
5. **Monitor performance** - Check for slow queries or missing indexes

---

**🎉 Congratulations!** Your Credlio database is now fully configured with all necessary tables, security policies, and optimizations for a production-ready credit bureau platform.