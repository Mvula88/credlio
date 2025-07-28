"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { USDCheckoutButton } from "@/components/stripe/usd-checkout-button"
import { useCountryDetection } from "@/hooks/use-country-detection"
import { Check, Crown, AlertCircle } from "lucide-react"

export function CountrySpecificPricing() {
  const { country, loading, error } = useCountryDetection()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing...</p>
        </div>
      </div>
    )
  }

  if (error || !country) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to load pricing. Please contact support.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {country.flag_emoji} Choose Your Plan - {country.name}
        </h2>
        <p className="text-gray-600">All prices in USD ($)</p>
      </div>

      {/* Namibian Special Message */}
      {country.has_special_payment_logic && country.special_payment_message && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">{country.special_payment_message}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Basic Plan</CardTitle>
            <div className="text-3xl font-bold text-blue-600">
              $12
              <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>
            <CardDescription>Essential tools for individual lenders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Unlimited borrower profiles
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Advanced risk tools
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Affordability calculator
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Watchlist management
              </li>
            </ul>

            <USDCheckoutButton planType="basic" price={12} />
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="border-2 border-blue-500 shadow-lg relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white px-4 py-1">
              <Crown className="w-4 h-4 mr-1" />
              Most Popular
            </Badge>
          </div>

          <CardHeader>
            <CardTitle className="text-xl">Premium Plan</CardTitle>
            <div className="text-3xl font-bold text-blue-600">
              $17
              <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>
            <CardDescription>Complete lending management solution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                All Basic features
              </li>
              <li className="flex items-center text-sm font-medium">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <strong>Marketplace access</strong>
              </li>
              <li className="flex items-center text-sm font-medium">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                <strong>Smart matching</strong>
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Priority support
              </li>
              <li className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2" />
                Advanced analytics
              </li>
            </ul>

            <USDCheckoutButton planType="premium" price={17} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
