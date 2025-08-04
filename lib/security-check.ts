/**
 * Security check for production deployment
 * This file ensures critical security measures are in place
 */

export function checkProductionSecurity() {
  if (process.env.NODE_ENV === 'production') {
    // Check if production ready flag is set
    if (process.env.PRODUCTION_READY !== 'true') {
      console.error('⚠️  SECURITY WARNING: Production deployment detected but PRODUCTION_READY flag is not true!')
      console.error('Please review SECURITY_CHECKLIST.md and run scripts/ENABLE_RLS_FOR_PRODUCTION.sql')
      
      // In production, this could throw an error to prevent deployment
      if (process.env.ENFORCE_SECURITY === 'true') {
        throw new Error('Security check failed: RLS may not be enabled. Review SECURITY_CHECKLIST.md')
      }
    }
  }
}

// Run check on app start
if (typeof window === 'undefined') {
  checkProductionSecurity()
}