import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"
import readline from "readline"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function main() {
  console.log("🔧 Supabase Setup Helper")
  console.log("------------------------")
  console.log("1. Check connection")
  console.log("2. Run SQL scripts in order")
  console.log("3. View tables")
  console.log("4. Reset database (DANGER)")
  console.log("5. Exit")

  rl.question("Select an option: ", async (answer) => {
    switch (answer) {
      case "1":
        await checkConnection()
        break
      case "2":
        await runSqlScripts()
        break
      case "3":
        await viewTables()
        break
      case "4":
        await confirmReset()
        break
      case "5":
        rl.close()
        return
      default:
        console.log("Invalid option")
    }

    // Return to menu after operation completes
    setTimeout(() => main(), 1000)
  })
}

async function checkConnection() {
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1)

    if (error) throw error

    console.log("✅ Successfully connected to Supabase!")
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error)
  }
}

async function runSqlScripts() {
  const scriptsDir = path.join(process.cwd(), "scripts")

  try {
    const files = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort()

    console.log(`Found ${files.length} SQL scripts`)

    for (const file of files) {
      console.log(`Running ${file}...`)
      const sqlContent = fs.readFileSync(path.join(scriptsDir, file), "utf8")

      const { error } = await supabase.sql(sqlContent)

      if (error) {
        console.error(`❌ Error running ${file}:`, error)
      } else {
        console.log(`✅ Successfully ran ${file}`)
      }
    }
  } catch (error) {
    console.error("Error running SQL scripts:", error)
  }
}

async function viewTables() {
  try {
    const { data, error } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")

    if (error) throw error

    console.log("Tables in your database:")
    data.forEach((table, i) => {
      console.log(`${i + 1}. ${table.tablename}`)
    })
  } catch (error) {
    console.error("Error fetching tables:", error)
  }
}

async function confirmReset() {
  rl.question(
    '⚠️ Are you sure you want to reset the database? This will delete ALL data. Type "RESET" to confirm: ',
    async (answer) => {
      if (answer === "RESET") {
        try {
          // This is a dangerous operation - it will drop all tables
          const { error } = await supabase.sql(`
          DO $$ 
          DECLARE
              r RECORD;
          BEGIN
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                  EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
              END LOOP;
          END $$;
        `)

          if (error) throw error

          console.log("✅ Database reset successfully")
        } catch (error) {
          console.error("Error resetting database:", error)
        }
      } else {
        console.log("Database reset cancelled")
      }
    }
  )
}

main()
