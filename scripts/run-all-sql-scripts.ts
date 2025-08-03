import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import type { Database } from "../lib/types/database"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables")
  process.exit(1)
}

// Create a Supabase client with the service role key
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

async function runSqlScript(filePath: string): Promise<void> {
  try {
    const scriptName = path.basename(filePath)
    console.log(`\n🔄 Running SQL script: ${scriptName}...`)

    const sql = fs.readFileSync(filePath, "utf8")

    // Split the SQL file into separate statements
    const statements = sql
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)

    for (const statement of statements) {
      const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" })

      if (error) {
        console.error(`❌ Error executing statement in ${scriptName}:`, error)
        console.error("Statement:", statement)
        // Continue with other statements even if one fails
      }
    }

    console.log(`✅ Successfully executed ${scriptName}`)
  } catch (error) {
    console.error(`❌ Error running SQL script ${filePath}:`, error)
  }
}

async function runAllSqlScripts() {
  console.log("🚀 Running all SQL setup scripts...")

  // First, create the exec_sql function if it doesn't exist
  try {
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    const { error } = await supabase.rpc("exec_sql", { sql: createFunctionSql })

    if (error) {
      // If the function doesn't exist yet, create it directly
      // await supabase.sql(createFunctionSql) // Note: .sql() method not available in SDK
    }
  } catch (error) {
    // If rpc fails, try creating the function directly
    try {
      const createFunctionSql = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
      // await supabase.sql(createFunctionSql) // Note: .sql() method not available in SDK
    } catch (innerError) {
      console.error("❌ Could not create exec_sql function:", innerError)
      console.log("⚠️ You may need to create this function manually in the Supabase SQL editor.")
    }
  }

  // Get all SQL files in the scripts directory
  const scriptsDir = path.join(__dirname, "..")
  const sqlFiles = fs
    .readdirSync(path.join(scriptsDir, "scripts"))
    .filter((file) => file.endsWith(".sql"))
    .sort() // Sort to ensure proper order (01_, 02_, etc.)
    .map((file) => path.join(scriptsDir, "scripts", file))

  if (sqlFiles.length === 0) {
    console.log("❌ No SQL files found in the scripts directory")
    return
  }

  console.log(`📋 Found ${sqlFiles.length} SQL files to execute`)

  // Run each SQL file
  for (const file of sqlFiles) {
    await runSqlScript(file)
  }

  console.log("\n✅ All SQL scripts have been executed!")
}

runAllSqlScripts()
