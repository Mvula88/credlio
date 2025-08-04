import { createHash } from 'crypto'

/**
 * Generate a unique customer ID for reference (not for authentication)
 */
export function generateCustomerId(countryCode: string): string {
  const year = new Date().getFullYear()
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `CRD-${countryCode.toUpperCase()}-${year}-${randomPart}`
}

// Keep old function name for backward compatibility during migration
export const generateUsername = generateCustomerId

/**
 * Hash sensitive data (ID numbers) for secure storage
 */
export function hashSensitiveData(data: string): string {
  return createHash('sha256').update(data.toLowerCase().trim()).digest('hex')
}

/**
 * Generate device fingerprint from request headers
 */
export function generateDeviceFingerprint(headers: Headers): string {
  const userAgent = headers.get('user-agent') || ''
  const acceptLanguage = headers.get('accept-language') || ''
  const acceptEncoding = headers.get('accept-encoding') || ''
  
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  return createHash('sha256').update(fingerprintData).digest('hex')
}

/**
 * Validate ID number format based on country
 */
export function validateIDNumber(idNumber: string, idType: 'national_id' | 'passport', country: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanID = idNumber.replace(/\s/g, '').toUpperCase()
  
  // Country-specific validation
  switch (country) {
    case 'KE': // Kenya
      if (idType === 'national_id') {
        // Kenyan ID: 8 digits
        return /^\d{8}$/.test(cleanID)
      } else {
        // Passport: Letter followed by 7-8 digits
        return /^[A-Z]\d{7,8}$/.test(cleanID)
      }
      
    case 'NG': // Nigeria
      if (idType === 'national_id') {
        // Nigerian NIN: 11 digits
        return /^\d{11}$/.test(cleanID)
      } else {
        // Passport: Letter followed by 8 digits
        return /^[A-Z]\d{8}$/.test(cleanID)
      }
      
    case 'ZA': // South Africa
      if (idType === 'national_id') {
        // SA ID: 13 digits
        return /^\d{13}$/.test(cleanID)
      } else {
        // Passport: Letter followed by 8-9 digits
        return /^[A-Z]\d{8,9}$/.test(cleanID)
      }
      
    case 'GH': // Ghana
      if (idType === 'national_id') {
        // Ghana Card: GHA followed by 12 digits
        return /^GHA\d{12}$/.test(cleanID)
      } else {
        // Passport: G followed by 7 digits
        return /^G\d{7}$/.test(cleanID)
      }
      
    default:
      // Generic validation: at least 6 characters
      return cleanID.length >= 6
  }
}

/**
 * Format display username (mask part of it for security)
 */
export function formatDisplayUsername(username: string): string {
  // CRD-KE-2024-A7B9X -> CRD-KE-2024-A****
  const parts = username.split('-')
  if (parts.length === 4) {
    const lastPart = parts[3]
    const masked = lastPart.charAt(0) + '****'
    return `${parts[0]}-${parts[1]}-${parts[2]}-${masked}`
  }
  return username
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Password must be at least 8 characters long')
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one uppercase letter')
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one lowercase letter')
  }
  
  // Number check
  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one number')
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one special character')
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  }
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 15)
  const random2 = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}-${random2}`
}

/**
 * Validate date of birth (must be 18+ years old)
 */
export function validateDateOfBirth(dob: string): boolean {
  const birthDate = new Date(dob)
  const today = new Date()
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age >= 18
}