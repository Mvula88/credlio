"use client"

import { useState } from "react"
import { CheckIcon } from "@/components/icons"

const plans = [
  {
    name: "Hobby",
    price: 0,
    description: "Perfect for personal projects and small teams.",
    features: ["Up to 5 projects", "Unlimited team members", "Basic analytics"],
  },
  {
    name: "Pro",
    price: 19,
    description: "For growing teams with more complex needs.",
    features: ["Unlimited projects", "Advanced analytics", "Priority support"],
  },
  {
    name: "Enterprise",
    price: 99,
    description: "For large organizations with dedicated support.",
    features: ["Customizable features", "Dedicated support team", "Advanced security options"],
  },
]

const SubscriptionPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState(null)

  return (
    <div>
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Choose your plan</h2>
        <p className="mt-3 text-xl text-gray-500">Simple, transparent pricing. Upgrade or downgrade at any time.</p>

        <div className="mt-12 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-md divide-y divide-gray-200 ${
                selectedPlan === plan.name ? "ring-2 ring-indigo-500" : ""
              }`}
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-5xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </div>
                <button
                  onClick={() => setSelectedPlan(plan.name)}
                  className="mt-6 w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Select Plan
                </button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900">Features</h4>
                <ul role="list" className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <div className="flex-shrink-0">
                        <CheckIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
                      </div>
                      <p className="ml-3 text-sm text-gray-500">{feature}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPlans
