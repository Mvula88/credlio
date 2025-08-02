import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, FileCheck, CreditCard, Star } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Profile",
    description: "Sign up with your basic information and verify your identity. It only takes a few minutes.",
    color: "bg-blue-500",
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Get Verified",
    description: "Complete our simple verification process to establish your credibility in the network.",
    color: "bg-purple-500",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Apply for Loans",
    description: "Browse available loan offers or create loan requests based on your needs.",
    color: "bg-emerald-500",
  },
  {
    number: "04",
    icon: Star,
    title: "Build Your Score",
    description: "Make timely payments to improve your trust score and unlock better loan terms.",
    color: "bg-orange-500",
  },
]

export function BorrowerHowItWorksSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            How it works for borrowers
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Get started in minutes and build your financial reputation
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-20 hidden h-0.5 w-full -translate-x-1/2 bg-gray-300 lg:block" />
              )}
              
              <Card className="relative h-full transition-all hover:shadow-lg">
                <CardContent className="p-6 text-center">
                  {/* Step Number */}
                  <div className="mb-4 text-5xl font-bold text-gray-200">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${step.color}`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 rounded-2xl bg-emerald-50 p-8 text-center">
          <h3 className="mb-4 text-2xl font-semibold text-gray-900">
            Start building your credit reputation today
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Join our growing community of borrowers who have successfully built their credit scores 
            and accessed better financial opportunities. No hidden fees, no surprises.
          </p>
        </div>
      </div>
    </section>
  )
}