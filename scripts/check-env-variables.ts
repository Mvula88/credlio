import dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Try to load environment variables from different locations
const envFiles = [".env.local", ".env", ".env.development.local", ".env.development"]

console.log("🔍 Checking environment variables...")
console.log("=====================================")

// Check if .env files exist
envFiles.forEach((file) => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${file}`)
    dotenv.config({ path: filePath })
  } else {
    console.log(`❌ Missing: ${file}`)
  }
})

console.log("\n📋 Environment Variables Status:")
console.log("=====================================")

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
]

let allPresent = true

requiredVars.forEach((varName) => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`❌ ${varName}: NOT SET`)
    allPresent = false
  }
})

if (allPresent) {
  console.log("\n🎉 All required environment variables are set!")

  // Test Supabase connection
  console.log("\n🔗 Testing Supabase connection...")
  try {
    const { createClient } = require("@supabase/supabase-js")
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    console.log("✅ Supabase client created successfully!")
  } catch (error) {
    console.log("❌ Failed to create Supabase client:", error)
  }
} else {
  console.log("\n⚠️ Some environment variables are missing. Please check your .env.local file.")
}

// Show current working directory
console.log(`\n📁 Current working directory: ${process.cwd()}`)

// Check if .env.local exists and show its content (without sensitive values)
const envLocalPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envLocalPath)) {
  console.log("\n📄 .env.local file structure:")
  const content = fs.readFileSync(envLocalPath, "utf8")
  const lines = content.split("\n")
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith("#")) {
      const [key] = line.split("=")
      console.log(`Line ${index + 1}: ${key}=***`)
    }
  })
} else {
  console.log("\n❌ .env.local file not found!")
  console.log("Please create a .env.local file in your project root with your Supabase credentials.")
}
