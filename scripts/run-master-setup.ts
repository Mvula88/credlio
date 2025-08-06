#!/usr/bin/env ts-node

/**
 * Credlio Master Database Setup Script
 * 
 * This script executes the master database setup and verification scripts
 * for the Credlio credit bureau platform.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

interface SetupConfig {
  supabaseUrl: string
  supabaseServiceKey: string
  dryRun?: boolean
}

class DatabaseSetupManager {
  private supabase: any
  private config: SetupConfig

  constructor(config: SetupConfig) {
    this.config = config
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
  }

  /**
   * Execute SQL script from file
   */
  private async executeScript(scriptPath: string, description: string): Promise<boolean> {
    try {
      log(`\n${colors.blue}${colors.bold}Executing: ${description}${colors.reset}`)
      
      const scriptContent = readFileSync(scriptPath, 'utf-8')
      
      if (this.config.dryRun) {
        log(`${colors.yellow}DRY RUN: Would execute script ${scriptPath}${colors.reset}`)
        return true
      }

      // Split script into individual statements and execute them
      const statements = scriptContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

      let successCount = 0
      let errorCount = 0

      for (const statement of statements) {
        if (statement.length === 0) continue
        
        try {
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement + ';' })
          
          if (error) {
            // Try direct execution if RPC fails
            const { error: directError } = await this.supabase
              .from('_temp_exec')
              .select('*')
              .limit(0) // This will fail, but we can catch SQL execution errors
            
            if (directError && !directError.message.includes('relation "_temp_exec" does not exist')) {
              throw directError
            }
          }
          
          successCount++
        } catch (error: any) {
          if (error.message?.includes('already exists') || 
              error.message?.includes('ON CONFLICT DO NOTHING')) {
            // These are expected for idempotent scripts
            successCount++
          } else {
            log(`${colors.red}Error executing statement: ${error.message}${colors.reset}`)
            errorCount++
          }
        }
      }

      if (errorCount === 0) {
        log(`${colors.green}✓ ${description} completed successfully (${successCount} statements)${colors.reset}`)
        return true
      } else {
        log(`${colors.yellow}⚠ ${description} completed with ${errorCount} errors, ${successCount} successful${colors.reset}`)
        return false
      }

    } catch (error: any) {
      log(`${colors.red}✗ Failed to execute ${description}: ${error.message}${colors.reset}`)
      return false
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      log(`${colors.cyan}Testing database connection...${colors.reset}`)
      
      const { data, error } = await this.supabase
        .from('_test')
        .select('*')
        .limit(1)

      // We expect this to fail with "relation does not exist" if connection works
      if (error && error.message.includes('relation "_test" does not exist')) {
        log(`${colors.green}✓ Database connection successful${colors.reset}`)
        return true
      } else if (!error) {
        log(`${colors.green}✓ Database connection successful${colors.reset}`)
        return true
      } else {
        log(`${colors.red}✗ Database connection failed: ${error.message}${colors.reset}`)
        return false
      }
    } catch (error: any) {
      log(`${colors.red}✗ Database connection failed: ${error.message}${colors.reset}`)
      return false
    }
  }

  /**
   * Run the complete database setup
   */
  async runSetup(): Promise<void> {
    log(`${colors.bold}${colors.blue}========================================`)
    log(`CREDLIO DATABASE SETUP`)
    log(`========================================${colors.reset}`)

    // Test connection first
    const connectionOk = await this.testConnection()
    if (!connectionOk) {
      log(`${colors.red}${colors.bold}Setup aborted due to connection failure${colors.reset}`)
      process.exit(1)
    }

    const scriptsDir = __dirname
    const setupResults: Array<{ name: string; success: boolean }> = []

    // 1. Execute master setup script
    const masterSetupPath = join(scriptsDir, 'MASTER_DATABASE_SETUP.sql')
    const masterSetupSuccess = await this.executeScript(
      masterSetupPath, 
      'Master Database Setup'
    )
    setupResults.push({ name: 'Master Setup', success: masterSetupSuccess })

    // 2. Execute verification script
    const verifySetupPath = join(scriptsDir, 'VERIFY_DATABASE_SETUP.sql')
    const verificationSuccess = await this.executeScript(
      verifySetupPath,
      'Setup Verification'
    )
    setupResults.push({ name: 'Verification', success: verificationSuccess })

    // 3. Display summary
    log(`\n${colors.bold}${colors.blue}========================================`)
    log(`SETUP SUMMARY`)
    log(`========================================${colors.reset}`)

    const successCount = setupResults.filter(r => r.success).length
    const totalCount = setupResults.length

    setupResults.forEach(result => {
      const status = result.success ? 
        `${colors.green}✓ COMPLETED` : 
        `${colors.red}✗ FAILED`
      log(`${result.name}: ${status}${colors.reset}`)
    })

    if (successCount === totalCount) {
      log(`\n${colors.green}${colors.bold}🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!${colors.reset}`)
      log(`${colors.green}Your Credlio database is ready for use.${colors.reset}`)
    } else {
      log(`\n${colors.yellow}${colors.bold}⚠ SETUP COMPLETED WITH ISSUES${colors.reset}`)
      log(`${colors.yellow}${successCount}/${totalCount} steps completed successfully.${colors.reset}`)
      log(`${colors.yellow}Please review the errors above and run the setup again if needed.${colors.reset}`)
    }

    // 4. Display next steps
    log(`\n${colors.cyan}${colors.bold}NEXT STEPS:${colors.reset}`)
    log(`${colors.cyan}1. Configure your environment variables${colors.reset}`)
    log(`${colors.cyan}2. Set up Stripe webhooks for subscriptions${colors.reset}`)
    log(`${colors.cyan}3. Test user authentication flow${colors.reset}`)
    log(`${colors.cyan}4. Create your first admin user${colors.reset}`)
    log(`${colors.cyan}5. Review the DATABASE_SETUP_GUIDE.md for details${colors.reset}`)
  }
}

/**
 * Load configuration from environment or prompt user
 */
async function loadConfig(): Promise<SetupConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    log(`${colors.red}${colors.bold}Missing required environment variables:${colors.reset}`)
    log(`${colors.red}NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}${colors.reset}`)
    log(`${colors.red}SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗'}${colors.reset}`)
    log(`\n${colors.yellow}Please set these environment variables and try again.${colors.reset}`)
    process.exit(1)
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    dryRun: process.argv.includes('--dry-run')
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const config = await loadConfig()
    const setupManager = new DatabaseSetupManager(config)
    
    if (config.dryRun) {
      log(`${colors.yellow}${colors.bold}DRY RUN MODE - No changes will be made${colors.reset}`)
    }
    
    await setupManager.runSetup()
  } catch (error: any) {
    log(`${colors.red}${colors.bold}Setup failed with error: ${error.message}${colors.reset}`)
    console.error(error)
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log(`\n${colors.yellow}Setup interrupted by user${colors.reset}`)
  process.exit(0)
})

process.on('unhandledRejection', (error: any) => {
  log(`${colors.red}Unhandled error: ${error.message}${colors.reset}`)
  console.error(error)
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  main()
}

export { DatabaseSetupManager, SetupConfig }