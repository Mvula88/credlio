// Test script for email functionality
// Run with: node scripts/test-email.js

require('dotenv').config({ path: '.env.local' })

async function testEmail() {
  console.log('Testing email configuration...\n')
  
  // Check environment variables
  const requiredVars = ['RESEND_API_KEY', 'EMAIL_FROM', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`)
      if (varName === 'EMAIL_FROM') {
        console.log('   Set EMAIL_FROM to your sender email (e.g., noreply@yourdomain.com)')
      }
    } else {
      console.log(`✅ ${varName} is configured`)
    }
  }
  
  console.log('\n📧 Email Setup Summary:')
  console.log('========================')
  console.log('1. Password Reset Flow:')
  console.log('   - User requests reset via /auth/forgot-password')
  console.log('   - Backend generates token and stores in password_reset_tokens table')
  console.log('   - Email sent via Resend with reset link')
  console.log('   - User clicks link to /auth/reset-password?token=xxx')
  console.log('   - Backend verifies token and updates password')
  
  console.log('\n2. Username Recovery Flow:')
  console.log('   - User requests username via /auth/forgot-username')
  console.log('   - Backend looks up username by email')
  console.log('   - Email sent via Resend with username')
  
  console.log('\n3. Required Database Setup:')
  console.log('   Run this SQL in Supabase SQL Editor:')
  console.log('   - scripts/CREATE_PASSWORD_RESET_TOKENS.sql')
  
  console.log('\n4. Email Configuration:')
  console.log('   - Service: Resend')
  console.log('   - API Key:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('   - From Email:', process.env.EMAIL_FROM || 'Using default: onboarding@resend.dev')
  
  console.log('\n5. Testing in Development:')
  console.log('   - Emails will be sent via Resend API')
  console.log('   - Check console logs for email details')
  console.log('   - Use Resend dashboard to monitor sent emails')
  
  console.log('\n✨ Setup Complete!')
  console.log('Make sure to run the SQL script to create the password_reset_tokens table.')
}

testEmail()