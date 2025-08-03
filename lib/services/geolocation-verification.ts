// Enhanced geolocation verification service
// Provides multi-layer location verification for country restrictions

import { getCountryFromIP } from './ip-geolocation'

export interface LocationVerificationResult {
  verified: boolean
  registeredCountry: string
  detectedCountry?: string
  ipAddress?: string
  verificationMethod: 'ip' | 'browser' | 'hybrid'
  riskScore: number // 0-100, higher = more suspicious
  flags: string[] // Specific risk indicators
  message?: string
}

export interface BrowserGeolocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

// Mapping of country codes to their rough geographic boundaries
const COUNTRY_BOUNDARIES = {
  NG: { lat: { min: 4.1, max: 13.9 }, lng: { min: 2.7, max: 14.7 } }, // Nigeria
  KE: { lat: { min: -4.7, max: 4.6 }, lng: { min: 33.9, max: 41.9 } }, // Kenya
  UG: { lat: { min: -1.5, max: 4.2 }, lng: { min: 29.5, max: 35.0 } }, // Uganda
  ZA: { lat: { min: -34.8, max: -22.1 }, lng: { min: 16.5, max: 32.9 } }, // South Africa
  GH: { lat: { min: 4.7, max: 11.2 }, lng: { min: -3.3, max: 1.2 } }, // Ghana
  TZ: { lat: { min: -11.7, max: -1.0 }, lng: { min: 29.3, max: 40.5 } }, // Tanzania
  RW: { lat: { min: -2.8, max: -1.0 }, lng: { min: 28.9, max: 30.9 } }, // Rwanda
  ZM: { lat: { min: -18.1, max: -8.2 }, lng: { min: 22.0, max: 33.7 } }, // Zambia
  NA: { lat: { min: -28.9, max: -17.8 }, lng: { min: 11.7, max: 25.3 } }, // Namibia
  BW: { lat: { min: -26.9, max: -17.8 }, lng: { min: 20.0, max: 29.4 } }, // Botswana
  MW: { lat: { min: -17.1, max: -9.4 }, lng: { min: 32.7, max: 35.9 } }, // Malawi
  SN: { lat: { min: 12.3, max: 16.7 }, lng: { min: -17.5, max: -11.4 } }, // Senegal
  ET: { lat: { min: 3.4, max: 14.9 }, lng: { min: 33.0, max: 48.0 } }, // Ethiopia
  CM: { lat: { min: 1.7, max: 13.1 }, lng: { min: 8.5, max: 16.2 } }, // Cameroon
  SL: { lat: { min: 6.9, max: 10.0 }, lng: { min: -13.3, max: -10.3 } }, // Sierra Leone
  ZW: { lat: { min: -22.4, max: -15.6 }, lng: { min: 25.2, max: 33.1 } }, // Zimbabwe
}

/**
 * Verify if IP location matches registered country
 */
export async function verifyIpLocation(
  ipAddress: string | null,
  registeredCountryCode: string
): Promise<LocationVerificationResult> {
  const riskFlags: string[] = []
  let riskScore = 0

  try {
    if (!ipAddress) {
      return {
        verified: false,
        registeredCountry: registeredCountryCode,
        verificationMethod: 'ip',
        riskScore: 50,
        flags: ['no_ip_address'],
        message: 'Unable to determine IP address'
      }
    }

    // Check for VPN/Proxy indicators
    if (await isVpnOrProxy(ipAddress)) {
      riskFlags.push('vpn_detected')
      riskScore += 30
    }

    // Get country from IP
    const geoResult = await getCountryFromIP(ipAddress)
    
    if (!geoResult.success || !geoResult.countryCode) {
      return {
        verified: false,
        registeredCountry: registeredCountryCode,
        ipAddress: ipAddress || undefined,
        verificationMethod: 'ip',
        riskScore: 60,
        flags: ['geolocation_failed'],
        message: 'Unable to determine location from IP'
      }
    }

    const detectedCountry = geoResult.countryCode

    // Check if countries match
    const countriesMatch = detectedCountry === registeredCountryCode

    if (!countriesMatch) {
      riskFlags.push('country_mismatch')
      riskScore += 40
      
      // Check if neighboring countries (allow some border flexibility)
      if (areNeighboringCountries(registeredCountryCode, detectedCountry)) {
        riskFlags.push('neighboring_country')
        riskScore -= 10 // Reduce risk for neighbors
      }
    }

    // Check for suspicious patterns
    if (isSuspiciousIp(ipAddress)) {
      riskFlags.push('suspicious_ip_pattern')
      riskScore += 20
    }

    return {
      verified: countriesMatch && riskScore < 50,
      registeredCountry: registeredCountryCode,
      detectedCountry,
      ipAddress: ipAddress || undefined,
      verificationMethod: 'ip',
      riskScore: Math.min(100, riskScore),
      flags: riskFlags,
      message: countriesMatch ? 'Location verified' : `Location mismatch: detected ${detectedCountry}, expected ${registeredCountryCode}`
    }
  } catch (error) {
    console.error('IP verification error:', error)
    return {
      verified: false,
      registeredCountry: registeredCountryCode,
      ipAddress: ipAddress || undefined,
      verificationMethod: 'ip',
      riskScore: 70,
      flags: ['verification_error'],
      message: 'Error during location verification'
    }
  }
}

/**
 * Verify browser geolocation matches country (Phase 2)
 */
export async function verifyBrowserLocation(
  location: BrowserGeolocation,
  registeredCountryCode: string
): Promise<LocationVerificationResult> {
  const riskFlags: string[] = []
  let riskScore = 0

  try {
    // Check if coordinates fall within country boundaries
    const boundaries = COUNTRY_BOUNDARIES[registeredCountryCode as keyof typeof COUNTRY_BOUNDARIES]
    
    if (!boundaries) {
      return {
        verified: false,
        registeredCountry: registeredCountryCode,
        verificationMethod: 'browser',
        riskScore: 50,
        flags: ['country_boundaries_unknown'],
        message: 'Unable to verify country boundaries'
      }
    }

    const withinBounds = 
      location.latitude >= boundaries.lat.min &&
      location.latitude <= boundaries.lat.max &&
      location.longitude >= boundaries.lng.min &&
      location.longitude <= boundaries.lng.max

    if (!withinBounds) {
      riskFlags.push('outside_country_bounds')
      riskScore += 50

      // Check if near border (within 50km)
      if (isNearBorder(location, registeredCountryCode)) {
        riskFlags.push('near_border')
        riskScore -= 15
      }
    }

    // Check location accuracy
    if (location.accuracy > 1000) { // More than 1km accuracy
      riskFlags.push('low_accuracy')
      riskScore += 10
    }

    // Check if location is spoofed
    if (isLocationSpoofed(location)) {
      riskFlags.push('location_spoofing_detected')
      riskScore += 40
    }

    return {
      verified: withinBounds && riskScore < 50,
      registeredCountry: registeredCountryCode,
      verificationMethod: 'browser',
      riskScore: Math.min(100, riskScore),
      flags: riskFlags,
      message: withinBounds ? 'Location verified' : 'Location outside registered country'
    }
  } catch (error) {
    console.error('Browser location verification error:', error)
    return {
      verified: false,
      registeredCountry: registeredCountryCode,
      verificationMethod: 'browser',
      riskScore: 70,
      flags: ['verification_error'],
      message: 'Error during browser location verification'
    }
  }
}

/**
 * Combined verification using both IP and browser location (Phase 2)
 */
export async function verifyHybridLocation(
  ipAddress: string | null,
  browserLocation: BrowserGeolocation | null,
  registeredCountryCode: string
): Promise<LocationVerificationResult> {
  // Get both verifications
  const ipResult = await verifyIpLocation(ipAddress, registeredCountryCode)
  
  if (!browserLocation) {
    return ipResult
  }

  const browserResult = await verifyBrowserLocation(browserLocation, registeredCountryCode)

  // Combine results
  const combinedRiskScore = Math.round((ipResult.riskScore + browserResult.riskScore) / 2)
  const combinedFlags = Array.from(new Set([...ipResult.flags, ...browserResult.flags]))

  // If both agree on verification, trust it more
  if (ipResult.verified && browserResult.verified) {
    return {
      verified: true,
      registeredCountry: registeredCountryCode,
      detectedCountry: ipResult.detectedCountry,
      ipAddress: ipResult.ipAddress,
      verificationMethod: 'hybrid',
      riskScore: Math.max(0, combinedRiskScore - 10), // Reduce risk for agreement
      flags: combinedFlags,
      message: 'Location verified by multiple methods'
    }
  }

  // If they disagree, be more suspicious
  if (ipResult.verified !== browserResult.verified) {
    combinedFlags.push('verification_mismatch')
    return {
      verified: false,
      registeredCountry: registeredCountryCode,
      detectedCountry: ipResult.detectedCountry,
      ipAddress: ipResult.ipAddress,
      verificationMethod: 'hybrid',
      riskScore: Math.min(100, combinedRiskScore + 20),
      flags: combinedFlags,
      message: 'Location verification methods disagree'
    }
  }

  return {
    verified: false,
    registeredCountry: registeredCountryCode,
    detectedCountry: ipResult.detectedCountry,
    ipAddress: ipResult.ipAddress,
    verificationMethod: 'hybrid',
    riskScore: combinedRiskScore,
    flags: combinedFlags,
    message: 'Location could not be verified'
  }
}

// Helper functions

async function isVpnOrProxy(ipAddress: string): Promise<boolean> {
  // In production, integrate with services like:
  // - ipqualityscore.com
  // - vpnapi.io
  // - proxycheck.io
  
  // For now, check common VPN patterns
  const vpnPatterns = [
    /^10\./, // Private network
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
    /^192\.168\./, // Private network
  ]
  
  return vpnPatterns.some(pattern => pattern.test(ipAddress))
}

function areNeighboringCountries(country1: string, country2: string): boolean {
  const neighbors: Record<string, string[]> = {
    NA: ['AO', 'ZM', 'BW', 'ZA'], // Namibia
    ZA: ['NA', 'BW', 'ZW', 'MZ', 'SZ', 'LS'], // South Africa
    NG: ['BJ', 'NE', 'TD', 'CM'], // Nigeria
    KE: ['ET', 'SO', 'SS', 'UG', 'TZ'], // Kenya
    // Add more as needed
  }
  
  return neighbors[country1]?.includes(country2) || false
}

function isSuspiciousIp(ipAddress: string): boolean {
  // Check for datacenter IPs, known VPN ranges, etc.
  // This is a simplified version
  const suspiciousRanges = [
    '104.', // Common datacenter range
    '45.', // Common VPN range
  ]
  
  return suspiciousRanges.some(range => ipAddress.startsWith(range))
}

function isNearBorder(location: BrowserGeolocation, countryCode: string): boolean {
  // Simplified border check - in production, use actual border data
  const boundaries = COUNTRY_BOUNDARIES[countryCode as keyof typeof COUNTRY_BOUNDARIES]
  if (!boundaries) return false
  
  const borderDistance = 0.5 // Roughly 50km in degrees
  
  return (
    Math.abs(location.latitude - boundaries.lat.min) < borderDistance ||
    Math.abs(location.latitude - boundaries.lat.max) < borderDistance ||
    Math.abs(location.longitude - boundaries.lng.min) < borderDistance ||
    Math.abs(location.longitude - boundaries.lng.max) < borderDistance
  )
}

function isLocationSpoofed(location: BrowserGeolocation): boolean {
  // Check for signs of spoofing
  // - Perfect round numbers
  // - Impossibly high accuracy
  // - Known spoofing coordinates
  
  const lat = location.latitude
  const lng = location.longitude
  
  // Check for round numbers (likely spoofed)
  if (lat % 1 === 0 || lng % 1 === 0) return true
  
  // Check for too-perfect accuracy
  if (location.accuracy < 1) return true // Less than 1 meter is suspicious
  
  // Check for default/test coordinates
  const knownFakes = [
    { lat: 0, lng: 0 }, // Null island
    { lat: 37.4419, lng: -122.1430 }, // Googleplex
  ]
  
  return knownFakes.some(fake => 
    Math.abs(lat - fake.lat) < 0.001 && 
    Math.abs(lng - fake.lng) < 0.001
  )
}