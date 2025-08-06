// IP-based geolocation service for country detection fallback
// This provides a backup method when phone number detection fails

interface GeolocationResult {
  success: boolean
  countryCode?: string
  countryName?: string
  ip?: string
  error?: string
}

/**
 * Get country from IP address using various geolocation services
 * This is a fallback method when phone number detection is not available
 */
export async function getCountryFromIP(ipAddress?: string): Promise<GeolocationResult> {
  try {
    // Check if this is a private/localhost IP address
    if (ipAddress && isPrivateIP(ipAddress)) {
      console.log('Private/localhost IP detected, skipping geolocation')
      return {
        success: false,
        error: 'Private IP address - geolocation not available',
      }
    }
    
    // Try multiple services for redundancy
    const services = [
      // Primary: ipapi.co (free, no API key required)
      async () => {
        const url = ipAddress 
          ? `https://ipapi.co/${ipAddress}/json/`
          : 'https://ipapi.co/json/'
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Credlio/1.0',
          },
        })
        
        if (!response.ok) throw new Error('ipapi.co request failed')
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.reason || 'IP lookup failed')
        }
        
        return {
          success: true,
          countryCode: data.country_code,
          countryName: data.country_name,
          ip: data.ip,
        }
      },
      
      // Fallback: ip-api.com (free tier available)
      async () => {
        const url = ipAddress
          ? `http://ip-api.com/json/${ipAddress}`
          : 'http://ip-api.com/json/'
        
        const response = await fetch(url)
        
        if (!response.ok) throw new Error('ip-api.com request failed')
        
        const data = await response.json()
        
        if (data.status === 'fail') {
          throw new Error(data.message || 'IP lookup failed')
        }
        
        return {
          success: true,
          countryCode: data.countryCode,
          countryName: data.country,
          ip: data.query,
        }
      },
    ]
    
    // Try each service until one succeeds
    for (const service of services) {
      try {
        const result = await service()
        if (result.success) {
          console.log('IP geolocation successful:', result)
          return result
        }
      } catch (error: any) {
        // Only log warning for non-private IP errors
        if (!error?.message?.includes('Reserved IP') && !error?.message?.includes('reserved range')) {
          console.warn('Geolocation service failed:', error)
        }
        // Continue to next service
      }
    }
    
    return {
      success: false,
      error: 'All geolocation services failed. Please ensure your phone number includes the country code.',
    }
  } catch (error) {
    console.error('IP geolocation error:', error)
    return {
      success: false,
      error: 'Failed to detect country from IP address',
    }
  }
}

/**
 * Server-side country detection from request headers
 * Should be called from API routes or server actions
 */
export function getIPFromRequest(request: Request): string | null {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }
  
  // Check other common headers
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  
  // Vercel specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) return vercelIP.split(',')[0].trim()
  
  return null
}

/**
 * Check if detected country is supported
 */
export function isDetectedCountrySupported(countryCode: string): boolean {
  const supportedCodes = [
    'NG', 'KE', 'UG', 'ZA', 'GH', 'TZ', 'RW', 'ZM',
    'NA', 'BW', 'MW', 'SN', 'ET', 'CM', 'SL', 'ZW'
  ]
  
  return supportedCodes.includes(countryCode.toUpperCase())
}

/**
 * Check if an IP address is private/localhost
 */
function isPrivateIP(ip: string): boolean {
  // Check for localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true
  }
  
  // Check for private IPv4 ranges
  const parts = ip.split('.')
  if (parts.length === 4) {
    const first = parseInt(parts[0])
    const second = parseInt(parts[1])
    
    // 10.0.0.0/8
    if (first === 10) return true
    
    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true
    
    // 192.168.0.0/16
    if (first === 192 && second === 168) return true
    
    // 169.254.0.0/16 (link-local)
    if (first === 169 && second === 254) return true
    
    // 127.0.0.0/8 (loopback)
    if (first === 127) return true
  }
  
  // Check for private IPv6 ranges
  if (ip.includes(':')) {
    const lowerIP = ip.toLowerCase()
    
    // Link-local
    if (lowerIP.startsWith('fe80:')) return true
    
    // Unique local
    if (lowerIP.startsWith('fc') || lowerIP.startsWith('fd')) return true
    
    // Loopback
    if (lowerIP === '::1') return true
  }
  
  return false
}