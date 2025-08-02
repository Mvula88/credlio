import fs from "fs"
import path from "path"
import readline from "readline"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

async function createEnvFile() {
  console.log("🔧 Creating .env.local file...")
  console.log("===============================")
  console.log("Please provide your Supabase credentials:")
  console.log("(You can find these in your Supabase Dashboard → Settings → API)")
  console.log("")

  try {
    const supabaseUrl = await askQuestion("Enter your Supabase URL (https://...): ")
    const anonKey = await askQuestion("Enter your Supabase Anon Key (eyJ...): ")
    const serviceKey = await askQuestion("Enter your Supabase Service Role Key (eyJ...): ")
    const jwtSecret = await askQuestion("Enter your JWT Secret (optional, press Enter to skip): ")

    // Validate inputs
    if (!supabaseUrl.startsWith("https://")) {
      console.log("❌ Invalid URL format. URL should start with https://")
      rl.close()
      return
    }

    if (!anonKey.startsWith("eyJ")) {
      console.log("❌ Invalid Anon Key format. Key should start with 'eyJ'")
      rl.close()
      return
    }

    if (!serviceKey.startsWith("eyJ")) {
      console.log("❌ Invalid Service Role Key format. Key should start with 'eyJ'")
      rl.close()
      return
    }

    // Create .env.local content
    const envContent = `# Supabase Configuration
# Generated on ${new Date().toISOString()}

# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}

# Your Supabase anon/public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}

# Your Supabase service role key (KEEP THIS SECRET!)
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}

${
  jwtSecret
    ? `# Your Supabase JWT secret (KEEP THIS SECRET!)
SUPABASE_JWT_SECRET=${jwtSecret}`
    : "# SUPABASE_JWT_SECRET=your-jwt-secret-here"
}

# Database URL (optional, for direct database access)
# DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
`

    // Write to .env.local
    const envPath = path.join(process.cwd(), ".env.local")
    fs.writeFileSync(envPath, envContent)

    console.log("\n✅ .env.local file created successfully!")
    console.log(`📁 Location: ${envPath}`)
    console.log("\n🔒 Security reminder:")
    console.log("- Never commit .env.local to version control")
    console.log("- Keep your service role key and JWT secret private")
    console.log("- Add .env.local to your .gitignore file")
  } catch (error) {
    console.log("❌ Error creating .env.local file:", error)
  } finally {
    rl.close()
  }
}

createEnvFile()
