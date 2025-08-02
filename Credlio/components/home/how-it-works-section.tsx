import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, Search, BarChart3, Handshake } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up and complete our secure verification process to establish your identity",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Search,
    title: "Search & Verify",
    description: "Access comprehensive credit reports and verify borrower information instantly",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: BarChart3,
    title: "Analyze Risk",
    description: "Use our advanced analytics to assess risk levels and make informed decisions",
    color: "from-green-500 to-green-600",
  },
  {
    icon: Handshake,
    title: "Build Trust",
    description: "Track transactions, update records, and build a trusted lending portfolio",
    color: "from-orange-500 to-orange-600",
  },
]

export function HowItWorksSection() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Start building trust in 4 simple steps
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Our streamlined process makes it easy to get started and begin making 
            secure lending decisions within minutes.
          </p>
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Connection Line */}
          <div className="absolute left-0 right-0 top-1/2 hidden h-0.5 -translate-y-1/2 transform bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 transform items-center justify-center rounded-full bg-white text-sm font-bold text-gray-900 shadow-md">
                  {index + 1}
                </div>

                <Card className="group h-full transition-all duration-300 hover:shadow-xl">
                  <CardContent className="flex flex-col items-center p-8 text-center">
                    {/* Icon Container */}
                    <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} p-4 shadow-lg transition-transform group-hover:scale-110`}>
                      <step.icon className="h-10 w-10 text-white" />
                    </div>

                    <h3 className="mb-3 text-xl font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="mb-6 text-lg text-gray-600">
            Ready to get started? Join thousands of users already building trust on our platform.
          </p>
        </div>
      </div>
    </section>
  )
}