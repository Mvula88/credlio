# Quick Stripe Setup Steps

Since you already have your publishable and secret keys, here's what you need to do:

## 1. Add Missing Variables to .env.local

Add these lines to your existing .env.local file:

```env
# Webhook secret (you'll get this in step 2)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (you'll get these in step 3)
STRIPE_PRICE_BASIC_USD=price_...
STRIPE_PRICE_PREMIUM_USD=price_...
```

## 2. Get Webhook Secret

### Option A: For Local Development (Recommended for testing)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli#install
2. Run in terminal:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the webhook signing secret shown (starts with `whsec_`)

### Option B: For Production
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events: All subscription and payment events
5. Copy the signing secret

## 3. Create Products and Get Price IDs

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"

### Basic Plan:
- Name: `Credlio Basic Plan`
- Price: `$12.99 USD`
- Billing: `Monthly`
- After saving, copy the Price ID (starts with `price_`)

### Premium Plan:
- Name: `Credlio Premium Plan`
- Price: `$19.99 USD`
- Billing: `Monthly`
- After saving, copy the Price ID (starts with `price_`)

## 4. Update Your .env.local

Your complete .env.local should now have:
```env
# Existing keys you mentioned
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# New additions
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC_USD=price_...
STRIPE_PRICE_PREMIUM_USD=price_...
```

## 5. Verify Setup

Run this command to verify everything is working:
```bash
npx tsx Credlio/scripts/verify-stripe-setup.ts
```

## That's it! 🎉

Once you've added these 3 variables (webhook secret and 2 price IDs), your Stripe integration will be fully functional.