# Credlio Database Setup Guide

This guide provides complete instructions for setting up the Credlio database with all necessary tables, policies, and data.

## 📋 Overview

The Credlio platform requires a comprehensive database setup including:
- User management and authentication
- Loan request and offer system
- Risk management and blacklisting
- Off-platform tracking (ghost loans)
- Communication system (chat)
- Subscription management
- Audit logging and analytics

## 🚀 Quick Setup

### Option 1: Run Master Setup Script

Execute the master setup script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of MASTER_DATABASE_SETUP.sql
-- This single script creates everything needed
```

### Option 2: Step-by-Step Setup

If you prefer to understand each component:

1. **Core Tables**: Run sections 1-3 of MASTER_DATABASE_SETUP.sql
2. **Loan System**: Run sections 4-5
3. **Risk Management**: Run section 6
4. **Communication**: Run section 7
5. **Security**: Run sections 10-11

## 📊 Database Schema Overview

### Core Tables
- `countries` - Supported countries (16 African markets)
- `user_roles` - User role definitions
- `profiles` - User profiles and basic information
- `user_profile_roles` - Many-to-many role assignments

### Loan Management
- `loan_requests` - Borrower loan requests
- `loan_offers` - Lender offers on requests
- `active_loans` - Active loan agreements
- `loan_payments` - Payment tracking

### Risk Management
- `blacklisted_borrowers` - Platform blacklist
- `off_platform_defaulters` - External default reports
- `ghost_borrowers` - Offline borrower tracking
- `ghost_loans` - Offline loan tracking
- `borrower_risk_history` - Risk status changes

### Communication
- `conversations` - Direct messaging between users
- `messages` - Individual messages
- `notifications` - System notifications

### Business Features
- `borrower_invitations` - Lender invitations to borrowers
- `watchlist` - Lender borrower watchlist
- `subscription_plans` - Subscription tiers
- `user_subscriptions` - User subscription status

### Analytics & Security
- `smart_tags` - AI-driven insights
- `reputation_badges` - Achievement system
- `audit_logs` - Complete audit trail
- `location_verification_logs` - Geographic access control

## 🔐 Security Features

### Row Level Security (RLS)
All sensitive tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Lenders can view borrower data with active subscriptions
- Admins have appropriate elevated access
- Country-based access restrictions

### Key Security Policies
- Profile access restricted to owner or admins
- Loan data visible to involved parties only
- Blacklist access for subscribed lenders
- Chat messages restricted to conversation participants

## 🔧 Post-Setup Tasks

After running the setup script:

1. **Verify Setup**: Run `VERIFY_DATABASE_SETUP.sql`
2. **Test Authentication**: Create test users via your app
3. **Configure Stripe**: Set up subscription webhooks
4. **Test RLS**: Verify policies work correctly
5. **Performance Test**: Check query performance with sample data

## 📈 Sample Data

The setup includes:
- 16 African countries with currency codes
- 5 user roles (borrower, lender, admin, country_admin, super_admin)
- 2 subscription plans (Basic $15, Premium $22)

## 🛠 Maintenance

### Regular Tasks
- Run `check_overdue_ghost_loans()` function daily
- Monitor audit logs for suspicious activity
- Update country flags and metadata as needed
- Review and update RLS policies

### Performance Monitoring
- Monitor index usage
- Check for slow queries
- Optimize based on usage patterns

## 🔍 Troubleshooting

### Common Issues

**RLS Policy Errors**
```sql
-- Check policy existence
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check user roles
SELECT p.email, ur.name as role 
FROM profiles p 
JOIN user_profile_roles upr ON p.id = upr.profile_id
JOIN user_roles ur ON upr.role_id = ur.id;
```

**Missing Tables**
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Foreign Key Issues**
```sql
-- Check foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f';
```

## 📚 Table Relationships

### Key Relationships
- `profiles` ← `user_profile_roles` → `user_roles`
- `profiles` ← `loan_requests` ← `loan_offers` → `active_loans`
- `profiles` ← `blacklisted_borrowers`
- `profiles` ← `conversations` → `messages`
- `profiles` ← `user_subscriptions` → `subscription_plans`

### Foreign Key Constraints
All tables with relationships include proper foreign key constraints with CASCADE deletes where appropriate.

## 🌍 Country Support

Currently configured for 16 African markets:
- Nigeria (NGN), Kenya (KES), Uganda (UGX), South Africa (ZAR)
- Ghana (GHS), Tanzania (TZS), Rwanda (RWF), Zambia (ZMW)
- Namibia (NAD), Botswana (BWP), Malawi (MWK), Senegal (XOF)
- Ethiopia (ETB), Cameroon (XAF), Sierra Leone (SLL), Zimbabwe (ZWL)

## 🔄 Future Enhancements

The database schema is designed to support:
- Additional countries and currencies
- Extended subscription tiers
- Advanced risk scoring algorithms
- Multi-language support
- Enhanced audit capabilities

## 📞 Support

For database-related issues:
1. Check the verification script output
2. Review audit logs for errors
3. Ensure all environment variables are set
4. Verify Supabase project configuration

---

**Note**: Always backup your database before running setup scripts in production.