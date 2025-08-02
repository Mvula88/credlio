# Stripe Setup Guide for Credlio

## Step 1: Create Products and Prices in Stripe Dashboard

### 1.1 Login to Stripe Dashboard
Go to https://dashboard.stripe.com

### 1.2 Create Products
Navigate to **Products** → **Add product**

Create two products:

#### Product 1: Basic Plan
- **Name**: Credlio Basic Plan
- **Description**: Access to basic lending features with up to 5 active borrowers
- **Pricing**: 
  - **Price**: $12.99
  - **Billing period**: Monthly
  - **Currency**: USD
- After creating, copy the **Price ID** (starts with `price_`)

#### Product 2: Premium Plan
- **Name**: Credlio Premium Plan  
- **Description**: Full access to all features including marketplace and unlimited borrowers
- **Pricing**:
  - **Price**: $19.99
  - **Billing period**: Monthly
  - **Currency**: USD
- After creating, copy the **Price ID** (starts with `price_`)

## Step 2: Set Up Webhook Endpoint

### 2.1 In Stripe Dashboard
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: 
   - For local testing: Use ngrok or similar (see Step 2.2)
   - For production: `https://yourdomain.com/api/stripe/webhook`
4. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 2.2 For Local Development Testing
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret shown (starts with `whsec_`)

## Step 3: Update Your .env.local File

Add these lines to your `.env.local`:

```env
# Stripe Configuration (you already have these)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
STRIPE_SECRET_KEY=sk_test_your-key-here

# Add these new variables:
# Webhook secret from Step 2
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Price IDs from Step 1
STRIPE_PRICE_BASIC_USD=price_your-basic-price-id-here
STRIPE_PRICE_PREMIUM_USD=price_your-premium-price-id-here
```

## Step 4: Verify Your Setup

### 4.1 Check environment variables are loaded:
```bash
npm run dev
```

Then visit: http://localhost:3000/api/debug-stripe

You should see:
```json
{
  "env": {
    "STRIPE_SECRET_KEY": "Set",
    "STRIPE_PRICE_BASIC_USD": "price_...",
    "STRIPE_PRICE_PREMIUM_USD": "price_..."
  },
  "products": {
    "basic": { ... },
    "premium": { ... }
  }
}
```

### 4.2 Test subscription flow:
1. Register as a lender
2. Go to lender dashboard
3. Click on subscription/upgrade options
4. Complete checkout with test card: `4242 4242 4242 4242`

## Step 5: Production Deployment

When deploying to production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Create new products** with live prices
3. **Update webhook endpoint** to your production URL
4. **Update environment variables** with live keys:
   - Use `pk_live_...` instead of `pk_test_...`
   - Use `sk_live_...` instead of `sk_test_...`
   - Update price IDs to live price IDs

## Important Notes

### Test Cards for Development
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires authentication**: 4000 0025 0000 3155

### Security Reminders
- Never commit API keys to version control
- Keep webhook endpoint secret
- Use environment variables for all sensitive data
- Verify webhook signatures in production

## Troubleshooting

### Webhook not receiving events
- Check Stripe CLI is running (for local dev)
- Verify endpoint URL is correct
- Check webhook signing secret matches

### Subscription not updating
- Verify webhook events are selected in Stripe
- Check Supabase logs for any database errors
- Ensure `subscriptions` table exists with proper columns

### Price not found error
- Double-check price IDs in .env.local
- Ensure you're using test keys with test prices (or live with live)
- Verify products are active in Stripe Dashboard