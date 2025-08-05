import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOTPEmail() {
  console.log("Testing OTP email sending...")
  console.log("=====================================\n")

  // Test email - change this to your test email
  const testEmail = "test@example.com" // Change this to your email
  
  try {
    console.log(`Sending OTP to: ${testEmail}`)
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: true, // Allow creating user if doesn't exist
      }
    })

    if (error) {
      console.error("❌ Error sending OTP:", error.message)
      console.error("Full error:", error)
      
      // Common error explanations
      if (error.message.includes("rate limit")) {
        console.log("\n⚠️  Rate limit hit. Wait a few minutes before trying again.")
      } else if (error.message.includes("not authorized")) {
        console.log("\n⚠️  Email sending might be disabled in Supabase.")
      }
    } else {
      console.log("✅ OTP email sent successfully!")
      console.log("Check your email for the verification code.")
      console.log("\nResponse data:", data)
    }
    
  } catch (err) {
    console.error("❌ Unexpected error:", err)
  }
}

// Run the test
testOTPEmail()