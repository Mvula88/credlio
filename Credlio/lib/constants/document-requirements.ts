export type DocumentType = 
  | 'national_id'
  | 'passport'
  | 'bank_statement'
  | 'payslip'
  | 'employment_letter'
  | 'business_permit'
  | 'utility_bill'
  | 'tax_returns'
  | 'asset_documentation'

export type DocumentCategory = 'identity' | 'income' | 'address' | 'employment' | 'additional'

export interface DocumentRequirement {
  id: DocumentType
  name: string
  category: DocumentCategory
  description: string
  required: boolean
  acceptedFormats: string[]
  maxSizeMB: number
  validityDays: number
  metadata: {
    checkDigitalSignature?: boolean
    checkBankLogo?: boolean
    checkCompanyLetterhead?: boolean
    checkExifData?: boolean
  }
}

export const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  // Identity Verification
  {
    id: 'national_id',
    name: 'National ID',
    category: 'identity',
    description: 'Government-issued national identification card',
    required: true,
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg'],
    maxSizeMB: 5,
    validityDays: 1825, // 5 years
    metadata: {
      checkExifData: true
    }
  },
  {
    id: 'passport',
    name: 'Passport',
    category: 'identity',
    description: 'Valid passport (can be used instead of National ID)',
    required: false, // Alternative to national_id
    acceptedFormats: ['image/jpeg', 'image/png', 'image/jpg'],
    maxSizeMB: 5,
    validityDays: 1825,
    metadata: {
      checkExifData: true
    }
  },

  // Income Verification
  {
    id: 'bank_statement',
    name: 'Bank Statement (3 months)',
    category: 'income',
    description: 'Recent bank statements showing transaction history',
    required: true,
    acceptedFormats: ['application/pdf'],
    maxSizeMB: 10,
    validityDays: 90,
    metadata: {
      checkDigitalSignature: true,
      checkBankLogo: true
    }
  },
  {
    id: 'payslip',
    name: 'Payslips (3 months)',
    category: 'income',
    description: 'Recent payslips for employed borrowers',
    required: false, // Required for employed
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    validityDays: 90,
    metadata: {
      checkCompanyLetterhead: true
    }
  },

  // Address Verification
  {
    id: 'utility_bill',
    name: 'Utility Bill',
    category: 'address',
    description: 'Recent electricity, water, or internet bill',
    required: true,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    validityDays: 90,
    metadata: {}
  },

  // Employment Verification
  {
    id: 'employment_letter',
    name: 'Employment Letter',
    category: 'employment',
    description: 'Letter from employer confirming employment',
    required: false, // Required for employed
    acceptedFormats: ['application/pdf'],
    maxSizeMB: 5,
    validityDays: 180,
    metadata: {
      checkCompanyLetterhead: true
    }
  },
  {
    id: 'business_permit',
    name: 'Business Permit/License',
    category: 'employment',
    description: 'Business registration for self-employed borrowers',
    required: false, // Required for self-employed
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    validityDays: 365,
    metadata: {}
  },

  // Additional Documents (for high-value loans)
  {
    id: 'tax_returns',
    name: 'Tax Returns',
    category: 'additional',
    description: 'Tax returns for additional income verification',
    required: false,
    acceptedFormats: ['application/pdf'],
    maxSizeMB: 10,
    validityDays: 365,
    metadata: {}
  },
  {
    id: 'asset_documentation',
    name: 'Asset Documentation',
    category: 'additional',
    description: 'Car registration, property documents, etc.',
    required: false,
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 10,
    validityDays: 365,
    metadata: {}
  }
]

export const REQUIRED_DOCUMENTS = DOCUMENT_REQUIREMENTS.filter(doc => doc.required)

export const DOCUMENT_CATEGORIES = [
  { id: 'identity', name: 'Identity Verification', icon: 'CreditCard' },
  { id: 'income', name: 'Income Verification', icon: 'DollarSign' },
  { id: 'address', name: 'Address Verification', icon: 'Home' },
  { id: 'employment', name: 'Employment Status', icon: 'Briefcase' },
  { id: 'additional', name: 'Additional Documents', icon: 'FileText' }
] as const

// Helper functions
export function getDocumentsByCategory(category: DocumentCategory): DocumentRequirement[] {
  return DOCUMENT_REQUIREMENTS.filter(doc => doc.category === category)
}

export function getRequiredDocumentsByEmploymentType(
  employmentType: 'employed' | 'self-employed' | 'other'
): DocumentRequirement[] {
  const baseRequired = DOCUMENT_REQUIREMENTS.filter(doc => doc.required)
  
  switch (employmentType) {
    case 'employed':
      return [
        ...baseRequired,
        DOCUMENT_REQUIREMENTS.find(doc => doc.id === 'payslip')!,
        DOCUMENT_REQUIREMENTS.find(doc => doc.id === 'employment_letter')!
      ]
    case 'self-employed':
      return [
        ...baseRequired,
        DOCUMENT_REQUIREMENTS.find(doc => doc.id === 'business_permit')!
      ]
    default:
      return baseRequired
  }
}