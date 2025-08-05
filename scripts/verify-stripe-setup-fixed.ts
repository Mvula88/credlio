import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function verifyStripeSetup() {
  console.log('🔍 Verifying Stripe Setup...\n');

  // Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_TIER_1',
    'STRIPE_PRICE_ID_TIER_2',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n⚠️  Please add these to your .env.local file');
    return;
  }

  console.log('✅ All required environment variables are set\n');

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
  });

  try {
    // Verify API key works
    console.log('2️⃣ Testing Stripe API Connection:');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.email || account.id}\n`);

    // Verify price IDs
    console.log('3️⃣ Verifying Price IDs:');
    
    const tier1Price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_TIER_1!);
    console.log(`✅ Tier 1 Plan Price: ${tier1Price.currency.toUpperCase()} ${(tier1Price.unit_amount! / 100).toFixed(2)} / ${tier1Price.recurring?.interval}`);
    console.log(`   Price ID: ${tier1Price.id}`);
    console.log(`   Product ID: ${tier1Price.product}`);
    
    const tier2Price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_TIER_2!);
    console.log(`\n✅ Tier 2 Plan Price: ${tier2Price.currency.toUpperCase()} ${(tier2Price.unit_amount! / 100).toFixed(2)} / ${tier2Price.recurring?.interval}`);
    console.log(`   Price ID: ${tier2Price.id}`);
    console.log(`   Product ID: ${tier2Price.product}`);

    // Display webhook info
    console.log('\n4️⃣ Webhook Configuration:');
    console.log(`✅ Webhook secret is configured: ${process.env.STRIPE_WEBHOOK_SECRET!.substring(0, 15)}...`);
    console.log(`✅ Publishable key: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!.substring(0, 20)}...`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Make sure your webhook endpoint is set up in Stripe Dashboard');
    console.log('   - Endpoint URL: https://your-domain.com/api/stripe/webhook');
    console.log('2. For local testing, use Stripe CLI:');
    console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('3. Test a subscription by:');
    console.log('   - Registering as a lender');
    console.log('   - Going to /lender/subscribe');
    console.log('   - Selecting a plan\n');

    console.log('✅ Stripe setup verified successfully!');

  } catch (error: any) {
    console.log('\n❌ Error verifying Stripe setup:');
    console.log(error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n⚠️  Your Stripe API key appears to be invalid.');
      console.log('Make sure you\'re using the correct key from your Stripe Dashboard.');
    } else if (error.code === 'resource_missing') {
      console.log('\n⚠️  One or more price IDs are invalid.');
      console.log('Make sure you\'ve created the products in Stripe and copied the correct price IDs.');
    }
  }
}

// Run the verification
verifyStripeSetup().catch(console.error);