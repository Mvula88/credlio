// Admin configuration for production security
// This file should NEVER be imported in client-facing code

export const adminConfig = {
  // Production admin access methods
  production: {
    // Option 1: Hidden route (current implementation)
    hiddenRoute: process.env.ADMIN_SECRET_ROUTE || 'sys-auth-2024',
    
    // Option 2: Separate subdomain (recommended for production)
    subdomain: process.env.ADMIN_SUBDOMAIN || null, // e.g., 'admin.credlio.com'
    
    // Option 3: IP whitelist
    allowedIPs: process.env.ADMIN_ALLOWED_IPS?.split(',') || [],
    
    // Option 4: Custom header requirement
    requiredHeader: process.env.ADMIN_HEADER_KEY || null,
    requiredHeaderValue: process.env.ADMIN_HEADER_VALUE || null,
  },
  
  // Security measures
  security: {
    // Require HTTPS in production
    requireHTTPS: process.env.NODE_ENV === 'production',
    
    // Session timeout (minutes)
    sessionTimeout: 30,
    
    // Max login attempts before lockout
    maxLoginAttempts: 3,
    
    // Lockout duration (minutes)
    lockoutDuration: 15,
    
    // Enable 2FA in production
    require2FA: process.env.NODE_ENV === 'production' && process.env.ENABLE_2FA === 'true',
  },
  
  // Obfuscation strategies
  obfuscation: {
    // Use fake 404 page for admin route if conditions not met
    show404: true,
    
    // Delay response for failed attempts (milliseconds)
    failureDelay: 2000,
    
    // Honeypot routes to detect scanners
    honeypots: ['/admin', '/wp-admin', '/administrator', '/backend'],
  }
}

// Check if request is from allowed IP
export function isAllowedIP(ip: string | null): boolean {
  if (!ip || adminConfig.production.allowedIPs.length === 0) {
    return true // No IP restriction if not configured
  }
  
  return adminConfig.production.allowedIPs.includes(ip)
}

// Check if request has required header
export function hasRequiredHeader(headers: Headers): boolean {
  if (!adminConfig.production.requiredHeader) {
    return true // No header requirement if not configured
  }
  
  const headerValue = headers.get(adminConfig.production.requiredHeader)
  return headerValue === adminConfig.production.requiredHeaderValue
}

// Generate a fake 404 response
export function generate404Response() {
  return new Response('404 - Page Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

// Check all security conditions
export function checkAdminAccess(request: Request): {
  allowed: boolean
  reason?: string
} {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip')
  
  // Check IP whitelist
  if (!isAllowedIP(ip)) {
    return { allowed: false, reason: 'IP not whitelisted' }
  }
  
  // Check required header
  if (!hasRequiredHeader(request.headers)) {
    return { allowed: false, reason: 'Missing required header' }
  }
  
  // Check HTTPS in production
  if (adminConfig.security.requireHTTPS && request.url.startsWith('http://')) {
    return { allowed: false, reason: 'HTTPS required' }
  }
  
  return { allowed: true }
}

// Delay response for security (prevent timing attacks)
export async function securityDelay(failed: boolean = false) {
  const delay = failed ? adminConfig.obfuscation.failureDelay : 100
  await new Promise(resolve => setTimeout(resolve, delay))
}

// Check if path is a honeypot
export function isHoneypot(path: string): boolean {
  return adminConfig.obfuscation.honeypots.some(hp => path.startsWith(hp))
}

// Log suspicious activity
export async function logSuspiciousActivity(
  path: string,
  ip: string | null,
  userAgent: string | null,
  reason: string
) {
  // In production, this would log to your security monitoring system
  console.warn('[SECURITY] Suspicious activity detected:', {
    path,
    ip,
    userAgent,
    reason,
    timestamp: new Date().toISOString()
  })
  
  // You could also send alerts, block IPs, etc.
}