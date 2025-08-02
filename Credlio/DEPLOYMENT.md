# Credlio Deployment Guide

This guide will help you deploy your Credlio application to production.

## Prerequisites

1. A Supabase account and project
2. A Vercel account
3. Your codebase ready for deployment

## Step 1: Set Up Supabase

1. Create a new Supabase project at [https://app.supabase.io](https://app.supabase.io)
2. Go to Project Settings > API to get your:
   - Project URL
   - `anon` public key
   - `service_role` secret key

3. Run the SQL setup scripts in the Supabase SQL Editor:
   - Run all scripts in the `/scripts` folder in numerical order
   - Start with `00_init_supabase.sql`
   - End with the latest migration script

## Step 2: Configure Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

## Step 3: Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add the environment variables from Step 2 to your Vercel project
4. Deploy your application

## Step 4: Configure Authentication

1. Go to your Supabase project > Authentication > URL Configuration
2. Add your production URL as an authorized redirect URL:
   - `https://your-domain.com/auth/callback`

## Step 5: Test Your Deployment

1. Visit your deployed application
2. Test the sign-up and sign-in flows
3. Verify that role-based redirects work correctly
4. Test all core functionality

## Troubleshooting

If you encounter any issues:

1. Check your environment variables in Vercel
2. Verify that your Supabase URL and keys are correct
3. Check the Supabase logs for any authentication errors
4. Ensure all SQL migrations have been applied correctly
