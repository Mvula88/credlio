import { signInSchema, signUpSchema } from '../auth'

describe('Auth Validation Schemas', () => {
  describe('signInSchema', () => {
    it('should validate correct sign in data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      }

      const result = signInSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'Password123',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Please enter a valid email address')
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters')
    })
  })

  describe('signUpSchema', () => {
    it('should validate correct sign up data', () => {
      const validData = {
        fullName: 'John Doe',
        phoneNumber: '1234567890',
        email: 'test@example.com',
        password: 'Password123',
        countryId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject password without uppercase', () => {
      const invalidData = {
        fullName: 'John Doe',
        phoneNumber: '1234567890',
        email: 'test@example.com',
        password: 'password123',
        countryId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must contain at least one uppercase letter')
    })

    it('should reject password without number', () => {
      const invalidData = {
        fullName: 'John Doe',
        phoneNumber: '1234567890',
        email: 'test@example.com',
        password: 'Password',
        countryId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must contain at least one number')
    })

    it('should reject invalid UUID for countryId', () => {
      const invalidData = {
        fullName: 'John Doe',
        phoneNumber: '1234567890',
        email: 'test@example.com',
        password: 'Password123',
        countryId: 'not-a-uuid',
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Please select a country')
    })
  })
})