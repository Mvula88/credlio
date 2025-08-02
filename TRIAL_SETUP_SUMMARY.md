# 1-Day Free Trial Setup Summary

## ✅ Frontend Changes (Already Done)
- Updated Stripe checkout to include `trial_period_days: 1`
- Added `payment_method_collection: "always"` to collect card upfront
- Updated environment variables to use `STRIPE_PRICE_ID_TIER_1` and `STRIPE_PRICE_ID_TIER_2`

## 📝 Backend Changes Needed

### 1. Run this SQL script in Supabase:
```bash
add_trial_support_to_subscriptions.sql
```

This adds:
- Trial tracking columns to `lender_subscriptions` table
- Functions to handle trial periods
- View to monitor trial subscriptions
- Proper status transitions from trial to active

### 2. Update your `.env.local`:
```env
# Replace old variables
# OLD: STRIPE_PRICE_BASIC_USD=...
# OLD: STRIPE_PRICE_PREMIUM_USD=...

# NEW: Your live price IDs
STRIPE_PRICE_ID_TIER_1=price_1RrJY4AsatKEdaFD4whD372E
STRIPE_PRICE_ID_TIER_2=price_1RrJRyAsatKEdaFDmLOcFcl8

# Make sure you're using LIVE keys (not test)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🔄 How the Trial Flow Works

1. **User signs up** → Stripe Checkout with 1-day trial
2. **Card collected** → No charge yet
3. **Webhook fires** → `customer.subscription.created` with status `trialing`
4. **Supabase records** → Trial start time and end time
5. **After 24 hours** → Stripe charges the card
6. **Webhook fires** → `customer.subscription.updated` with status `active`
7. **Supabase updates** → Trial converted to active subscription

## 📊 Monitor Trials

After setup, you can monitor trials in Supabase:

```sql
-- View all trial subscriptions
SELECT * FROM trial_subscriptions;

-- Check if specific user is in trial
SELECT is_user_in_trial('user-id-here');
```

## ⚠️ Important Notes

1. **Webhook Events**: Make sure these events are enabled in Stripe Dashboard:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `invoice.payment_succeeded`

2. **Testing**: Test with Stripe's test mode first before going live

3. **Grace Period**: The trial is exactly 24 hours from signup

That's it! Your 1-day free trial is ready to go! 🎉