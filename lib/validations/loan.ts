import { z } from "zod"

export const loanApplicationSchema = z.object({
  loanAmount: z
    .number()
    .min(100, "Minimum loan amount is 100")
    .max(50000, "Maximum loan amount is 50,000"),
  loanPurpose: z.string().min(10, "Please provide more details about the loan purpose"),
  repaymentPeriod: z
    .number()
    .min(1, "Minimum repayment period is 1 month")
    .max(60, "Maximum repayment period is 60 months"),
  monthlyIncome: z
    .number()
    .min(0, "Monthly income must be a positive number"),
  employmentStatus: z.enum(["employed", "self-employed", "unemployed", "student", "retired"]),
  employerName: z.string().optional(),
  employmentDuration: z.string().optional(),
  hasCollateral: z.boolean(),
  collateralDescription: z.string().optional(),
  collateralValue: z.number().optional(),
})

export const loanOfferSchema = z.object({
  offeredAmount: z.number().min(100, "Minimum offer amount is 100"),
  interestRate: z
    .number()
    .min(0, "Interest rate must be positive")
    .max(100, "Interest rate cannot exceed 100%"),
  repaymentPeriod: z.number().min(1, "Minimum repayment period is 1 month"),
  repaymentSchedule: z.enum(["weekly", "bi-weekly", "monthly"]),
  conditions: z.string().optional(),
})

export const loanUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "under_review",
    "approved",
    "rejected",
    "funded",
    "active",
    "completed",
    "defaulted",
  ]),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>
export type LoanOfferInput = z.infer<typeof loanOfferSchema>
export type LoanUpdateInput = z.infer<typeof loanUpdateSchema>