// Phone number country detection utility
// Maps phone country codes to ISO country codes

interface CountryPhoneMapping {
  phoneCode: string
  countryCode: string
  countryName: string
  phoneLength?: number // Optional: expected phone number length (excluding country code)
}

// Mapping of phone country codes to ISO country codes for African countries
const PHONE_COUNTRY_MAPPINGS: CountryPhoneMapping[] = [
  { phoneCode: '+234', countryCode: 'NG', countryName: 'Nigeria', phoneLength: 10 },
  { phoneCode: '+254', countryCode: 'KE', countryName: 'Kenya', phoneLength: 9 },
  { phoneCode: '+256', countryCode: 'UG', countryName: 'Uganda', phoneLength: 9 },
  { phoneCode: '+27', countryCode: 'ZA', countryName: 'South Africa', phoneLength: 9 },
  { phoneCode: '+233', countryCode: 'GH', countryName: 'Ghana', phoneLength: 9 },
  { phoneCode: '+255', countryCode: 'TZ', countryName: 'Tanzania', phoneLength: 9 },
  { phoneCode: '+250', countryCode: 'RW', countryName: 'Rwanda', phoneLength: 9 },
  { phoneCode: '+260', countryCode: 'ZM', countryName: 'Zambia', phoneLength: 9 },
  { phoneCode: '+264', countryCode: 'NA', countryName: 'Namibia', phoneLength: 9 },
  { phoneCode: '+267', countryCode: 'BW', countryName: 'Botswana', phoneLength: 8 },
  { phoneCode: '+265', countryCode: 'MW', countryName: 'Malawi', phoneLength: 9 },
  { phoneCode: '+221', countryCode: 'SN', countryName: 'Senegal', phoneLength: 9 },
  { phoneCode: '+251', countryCode: 'ET', countryName: 'Ethiopia', phoneLength: 9 },
  { phoneCode: '+237', countryCode: 'CM', countryName: 'Cameroon', phoneLength: 9 },
  { phoneCode: '+232', countryCode: 'SL', countryName: 'Sierra Leone', phoneLength: 8 },
  { phoneCode: '+263', countryCode: 'ZW', countryName: 'Zimbabwe', phoneLength: 9 },
]

export interface PhoneCountryDetectionResult {
  success: boolean
  countryCode?: string
  countryName?: string
  phoneCode?: string
  formattedNumber?: string
  error?: string
}

/**
 * Detects country from phone number
 * Accepts formats: +264812345678, 264812345678, 0812345678 (with default country)
 */
export function detectCountryFromPhone(
  phoneNumber: string,
  defaultCountryCode?: string
): PhoneCountryDetectionResult {
  // Remove all non-numeric characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Check if it starts with + or a known country code
  if (cleaned.startsWith('+')) {
    // Try to match with our supported countries
    for (const mapping of PHONE_COUNTRY_MAPPINGS) {
      if (cleaned.startsWith(mapping.phoneCode)) {
        const nationalNumber = cleaned.substring(mapping.phoneCode.length)
        
        // Validate length if specified
        if (mapping.phoneLength && nationalNumber.length !== mapping.phoneLength) {
          return {
            success: false,
            error: `Invalid phone number length for ${mapping.countryName}. Expected ${mapping.phoneLength} digits after country code.`
          }
        }
        
        return {
          success: true,
          countryCode: mapping.countryCode,
          countryName: mapping.countryName,
          phoneCode: mapping.phoneCode,
          formattedNumber: cleaned
        }
      }
    }
    
    return {
      success: false,
      error: 'Phone number country code not supported. Please check our list of supported countries.'
    }
  }
  
  // Check if it starts with country code without +
  for (const mapping of PHONE_COUNTRY_MAPPINGS) {
    const codeWithoutPlus = mapping.phoneCode.substring(1)
    if (cleaned.startsWith(codeWithoutPlus)) {
      const nationalNumber = cleaned.substring(codeWithoutPlus.length)
      
      // Validate length if specified
      if (mapping.phoneLength && nationalNumber.length !== mapping.phoneLength) {
        return {
          success: false,
          error: `Invalid phone number length for ${mapping.countryName}. Expected ${mapping.phoneLength} digits after country code.`
        }
      }
      
      return {
        success: true,
        countryCode: mapping.countryCode,
        countryName: mapping.countryName,
        phoneCode: mapping.phoneCode,
        formattedNumber: '+' + cleaned
      }
    }
  }
  
  // If starts with 0 and we have a default country, try to format it
  if (cleaned.startsWith('0') && defaultCountryCode) {
    const mapping = PHONE_COUNTRY_MAPPINGS.find(m => m.countryCode === defaultCountryCode)
    if (mapping) {
      const nationalNumber = cleaned.substring(1)
      
      if (mapping.phoneLength && nationalNumber.length !== mapping.phoneLength) {
        return {
          success: false,
          error: `Invalid phone number length for ${mapping.countryName}. Expected ${mapping.phoneLength} digits.`
        }
      }
      
      return {
        success: true,
        countryCode: mapping.countryCode,
        countryName: mapping.countryName,
        phoneCode: mapping.phoneCode,
        formattedNumber: mapping.phoneCode + nationalNumber
      }
    }
  }
  
  return {
    success: false,
    error: 'Invalid phone number format. Please include your country code (e.g., +264 for Namibia).'
  }
}

/**
 * Formats phone number with proper country code
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  const cleaned = phoneNumber.replace(/[^\d]/g, '')
  const mapping = PHONE_COUNTRY_MAPPINGS.find(m => m.countryCode === countryCode)
  
  if (!mapping) return phoneNumber
  
  // If already has country code
  if (cleaned.startsWith(mapping.phoneCode.substring(1))) {
    return '+' + cleaned
  }
  
  // If starts with 0, remove it and add country code
  if (cleaned.startsWith('0')) {
    return mapping.phoneCode + cleaned.substring(1)
  }
  
  // Otherwise add country code
  return mapping.phoneCode + cleaned
}

/**
 * Get list of supported countries with phone codes
 */
export function getSupportedPhoneCountries() {
  return PHONE_COUNTRY_MAPPINGS.map(m => ({
    code: m.countryCode,
    name: m.countryName,
    phoneCode: m.phoneCode,
    example: m.phoneCode + '0'.repeat(m.phoneLength || 9)
  }))
}

/**
 * Check if a country code is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return PHONE_COUNTRY_MAPPINGS.some(m => m.countryCode === countryCode)
}