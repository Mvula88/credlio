import { createHash } from 'crypto'

/**
 * Document verification service - NO STORAGE OF DOCUMENTS
 * Only processes documents in memory and stores verification results
 */

export interface DocumentMetadata {
  createdAt?: Date
  modifiedAt?: Date
  creator?: string
  producer?: string
  hasDigitalSignature?: boolean
  pageCount?: number
  fileSize?: number
}

export interface VerificationResult {
  documentHash: string
  documentType: 'bank_statement' | 'national_id' | 'passport' | 'utility_bill' | 'employment_letter'
  status: 'verified' | 'failed' | 'suspicious'
  flags: {
    metadataValid: boolean
    formatValid: boolean
    signatureValid?: boolean
    templateMatch?: boolean
    dateRangeValid?: boolean
    institutionVerified?: boolean
  }
  details: {
    institution?: string
    dateRange?: { from: Date; to: Date }
    documentDate?: Date
    suspiciousIndicators?: string[]
  }
}

/**
 * Generate SHA-256 hash of document for duplicate detection
 */
export async function generateDocumentHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Extract metadata from PDF (simplified version)
 */
export async function extractPDFMetadata(file: File): Promise<DocumentMetadata> {
  // In real implementation, use pdf-lib or similar
  // This is a simplified version
  const text = await file.text()
  
  const metadata: DocumentMetadata = {
    fileSize: file.size,
    createdAt: new Date(file.lastModified)
  }
  
  // Check for common PDF metadata patterns
  if (text.includes('/Creator')) {
    const creatorMatch = text.match(/\/Creator\s*\((.*?)\)/)
    if (creatorMatch) metadata.creator = creatorMatch[1]
  }
  
  if (text.includes('/Producer')) {
    const producerMatch = text.match(/\/Producer\s*\((.*?)\)/)
    if (producerMatch) metadata.producer = producerMatch[1]
  }
  
  return metadata
}

/**
 * Verify bank statement authenticity
 */
export async function verifyBankStatement(file: File): Promise<VerificationResult> {
  const hash = await generateDocumentHash(file)
  const metadata = await extractPDFMetadata(file)
  const text = await file.text()
  
  const result: VerificationResult = {
    documentHash: hash,
    documentType: 'bank_statement',
    status: 'verified',
    flags: {
      metadataValid: true,
      formatValid: true,
      signatureValid: false,
      templateMatch: false,
      dateRangeValid: true,
      institutionVerified: false
    },
    details: {}
  }
  
  // Check for bank indicators
  const bankPatterns = {
    'KCB': /KCB\s*Bank|Kenya\s*Commercial\s*Bank/i,
    'Equity': /Equity\s*Bank/i,
    'Cooperative': /Co-operative\s*Bank/i,
    'Stanbic': /Stanbic\s*Bank/i,
    'ABSA': /ABSA\s*Bank|Barclays/i,
    'Standard Chartered': /Standard\s*Chartered/i
  }
  
  for (const [bank, pattern] of Object.entries(bankPatterns)) {
    if (pattern.test(text)) {
      result.details.institution = bank
      result.flags.institutionVerified = true
      break
    }
  }
  
  // Check for suspicious indicators
  const suspiciousIndicators: string[] = []
  
  // Check metadata
  if (!metadata.creator || metadata.creator.includes('Microsoft Word')) {
    suspiciousIndicators.push('Document created with word processor')
  }
  
  // Check for common fraud patterns
  if (text.includes('EDITED') || text.includes('MODIFIED')) {
    suspiciousIndicators.push('Document contains edit markers')
  }
  
  // Check file size (bank statements are usually 50KB-500KB)
  if (file.size < 20000 || file.size > 2000000) {
    suspiciousIndicators.push('Unusual file size for bank statement')
  }
  
  // Set final status
  if (suspiciousIndicators.length > 0) {
    result.status = 'suspicious'
    result.details.suspiciousIndicators = suspiciousIndicators
  } else if (!result.flags.institutionVerified) {
    result.status = 'failed'
  }
  
  return result
}

/**
 * Verify ID document (simplified)
 */
export async function verifyIDDocument(
  file: File,
  documentType: 'national_id' | 'passport'
): Promise<VerificationResult> {
  const hash = await generateDocumentHash(file)
  
  const result: VerificationResult = {
    documentHash: hash,
    documentType,
    status: 'verified',
    flags: {
      metadataValid: true,
      formatValid: true
    },
    details: {}
  }
  
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    result.status = 'failed'
    result.flags.formatValid = false
    result.details.suspiciousIndicators = ['Document is not an image']
  }
  
  // Check file size (ID photos should be 100KB-5MB)
  if (file.size < 50000 || file.size > 10000000) {
    result.status = 'suspicious'
    result.details.suspiciousIndicators = result.details.suspiciousIndicators || []
    result.details.suspiciousIndicators.push('Unusual file size for ID document')
  }
  
  return result
}

/**
 * Check if document has been used before
 */
export async function checkDuplicateDocument(
  supabase: any,
  documentHash: string,
  documentType: string
): Promise<{ isDuplicate: boolean; existingUserId?: string }> {
  const { data } = await supabase
    .from('document_verifications')
    .select('user_id')
    .eq('document_hash', documentHash)
    .eq('document_type', documentType)
    .single()
  
  return {
    isDuplicate: !!data,
    existingUserId: data?.user_id
  }
}

/**
 * Save verification result (no document stored)
 */
export async function saveVerificationResult(
  supabase: any,
  userId: string,
  result: VerificationResult,
  verifiedBy?: string
): Promise<void> {
  await supabase
    .from('document_verifications')
    .insert({
      user_id: userId,
      document_hash: result.documentHash,
      document_type: result.documentType,
      verification_status: result.status,
      verification_flags: result.flags,
      verified_by: verifiedBy,
      expires_at: getExpirationDate(result.documentType)
    })
}

/**
 * Get document expiration date based on type
 */
function getExpirationDate(documentType: string): Date {
  const expirationDays = {
    'bank_statement': 90, // 3 months
    'utility_bill': 90,   // 3 months
    'employment_letter': 180, // 6 months
    'national_id': 1825,  // 5 years
    'passport': 1825      // 5 years
  }
  
  const days = expirationDays[documentType as keyof typeof expirationDays] || 90
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Create verification alert for suspicious activity
 */
export async function createVerificationAlert(
  supabase: any,
  alertType: 'duplicate_document' | 'failed_verification' | 'suspicious_pattern',
  userId: string,
  documentHash?: string,
  details?: any
): Promise<void> {
  await supabase
    .from('verification_alerts')
    .insert({
      alert_type: alertType,
      user_id: userId,
      document_hash: documentHash,
      details,
      resolved: false
    })
}