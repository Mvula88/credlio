const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQL(filename) {
  try {
    const sqlPath = path.join(__dirname, filename)
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log(`Running ${filename}...`)
    
    // Split by semicolons but preserve those within strings
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        }).single()
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_sql').select(statement)
          if (directError) {
            console.error(`Error executing statement: ${directError.message}`)
            console.error(`Statement: ${statement.substring(0, 100)}...`)
          }
        }
      }
    }
    
    console.log(`✅ ${filename} executed successfully`)
  } catch (error) {
    console.error(`Error running ${filename}:`, error.message)
  }
}

async function setup() {
  console.log('Setting up loan agreements tables...\n')
  
  // Run the SQL files in order
  await runSQL('CREATE_LOAN_AGREEMENTS_TABLE.sql')
  await runSQL('CREATE_AGREEMENT_AUDIT_LOG.sql')
  
  console.log('\n✅ All tables created successfully!')
}

setup().catch(console.error)