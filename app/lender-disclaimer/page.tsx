"use client"
import { CountrySpecificPricing } from "@/components/country-specific-pricing"

const LenderDisclaimerPage = () => {
  const handleSelectPlan = (plan: any) => {
    // Process the selected plan based on country-specific pricing
    console.log("Selected Plan:", plan)
    // You can add your logic here to handle the subscription
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 text-2xl font-bold">Lender Disclaimer & Subscription</h1>
      <p className="mb-4">
        Please read the following disclaimer carefully before proceeding with your subscription.
      </p>
      <p className="mb-4">
        This platform connects you with various lenders. We are not responsible for the terms and
        conditions offered by individual lenders. Please review all loan agreements thoroughly
        before accepting any offers.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Subscription Options</h2>
        <CountrySpecificPricing onSelectPlan={handleSelectPlan} />
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Disclaimer</h2>
        <p>
          By subscribing to our platform, you acknowledge that you have read and understood the
          above disclaimer.
        </p>
      </section>
    </div>
  )
}

export default LenderDisclaimerPage
