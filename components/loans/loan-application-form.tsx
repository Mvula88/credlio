"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { loanApplicationSchema, type LoanApplicationInput } from "@/lib/validations/loan"
import { useErrorHandler } from "@/hooks/use-error-handler"

export function LoanApplicationForm() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { error, isLoading, execute } = useErrorHandler()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoanApplicationInput>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      hasCollateral: false,
    },
  })

  const hasCollateral = watch("hasCollateral")
  const employmentStatus = watch("employmentStatus")

  const onSubmit = async (data: LoanApplicationInput) => {
    const result = await execute(async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error("Not authenticated")

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (profileError) throw profileError

      // Create loan application
      const { data: application, error: applicationError } = await supabase
        .from("loan_applications")
        .insert({
          borrower_id: profile.id,
          loan_amount: data.loanAmount,
          loan_purpose: data.loanPurpose,
          repayment_period: data.repaymentPeriod,
          monthly_income: data.monthlyIncome,
          employment_status: data.employmentStatus,
          employer_name: data.employerName,
          employment_duration: data.employmentDuration,
          has_collateral: data.hasCollateral,
          collateral_description: data.collateralDescription,
          collateral_value: data.collateralValue,
          status: "pending",
        })
        .select()
        .single()

      if (applicationError) throw applicationError

      return application
    })

    if (result) {
      router.push("/borrower/dashboard")
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Loan Application</CardTitle>
        <CardDescription>
          Fill out this form to apply for a loan. All fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount ($) *</Label>
              <Input
                id="loanAmount"
                type="number"
                {...register("loanAmount", { valueAsNumber: true })}
                placeholder="5000"
              />
              {errors.loanAmount && (
                <p className="text-sm text-red-500">{errors.loanAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="repaymentPeriod">Repayment Period (months) *</Label>
              <Input
                id="repaymentPeriod"
                type="number"
                {...register("repaymentPeriod", { valueAsNumber: true })}
                placeholder="12"
              />
              {errors.repaymentPeriod && (
                <p className="text-sm text-red-500">{errors.repaymentPeriod.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loanPurpose">Loan Purpose *</Label>
            <Textarea
              id="loanPurpose"
              {...register("loanPurpose")}
              placeholder="Describe what you need the loan for..."
              rows={3}
            />
            {errors.loanPurpose && (
              <p className="text-sm text-red-500">{errors.loanPurpose.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Monthly Income ($) *</Label>
              <Input
                id="monthlyIncome"
                type="number"
                {...register("monthlyIncome", { valueAsNumber: true })}
                placeholder="3000"
              />
              {errors.monthlyIncome && (
                <p className="text-sm text-red-500">{errors.monthlyIncome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentStatus">Employment Status *</Label>
              <Select 
                value={employmentStatus}
                onValueChange={(value) => setValue("employmentStatus", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
              {errors.employmentStatus && (
                <p className="text-sm text-red-500">{errors.employmentStatus.message}</p>
              )}
            </div>
          </div>

          {(employmentStatus === "employed" || employmentStatus === "self-employed") && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employerName">Employer Name</Label>
                <Input
                  id="employerName"
                  {...register("employerName")}
                  placeholder="Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentDuration">Employment Duration</Label>
                <Input
                  id="employmentDuration"
                  {...register("employmentDuration")}
                  placeholder="e.g., 2 years"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasCollateral"
                checked={hasCollateral}
                onCheckedChange={(checked) => setValue("hasCollateral", checked as boolean)}
              />
              <Label htmlFor="hasCollateral" className="cursor-pointer">
                I have collateral to secure this loan
              </Label>
            </div>

            {hasCollateral && (
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="collateralDescription">Collateral Description</Label>
                  <Textarea
                    id="collateralDescription"
                    {...register("collateralDescription")}
                    placeholder="Describe your collateral..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateralValue">Estimated Value ($)</Label>
                  <Input
                    id="collateralValue"
                    type="number"
                    {...register("collateralValue", { valueAsNumber: true })}
                    placeholder="10000"
                  />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}