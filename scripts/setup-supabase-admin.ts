import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function setupSupabase() {
  try {
    console.log("Setting up Supabase...")

    // Read and execute SQL scripts in order
    const scriptsDir = path.join(__dirname, "scripts")
    const scriptFiles = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    for (const scriptFile of scriptFiles) {
      console.log(`Executing ${scriptFile}...`)
      const scriptPath = path.join(scriptsDir, scriptFile)
      const scriptContent = fs.readFileSync(scriptPath, "utf8")

      // Split script into individual statements
      const statements = scriptContent.split(";").filter((statement) => statement.trim().length > 0)

      for (const statement of statements) {
        const { error } = await supabase.rpc("exec_sql", { sql: statement })
        if (error) {
          console.error(`Error executing statement from ${scriptFile}:`, error)
        }
      }

      console.log(`Completed ${scriptFile}`)
    }

    console.log("Supabase setup complete!")
  } catch (error) {
    console.error("Error setting up Supabase:", error)
    process.exit(1)
  }
}

setupSupabase()
