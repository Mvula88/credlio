import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Star,
  TrendingUp,
  Shield,
  Clock,
  CreditCard,
  Users,
  CheckCircle,
  Award,
  FileCheck
} from "lucide-react"

const benefits = [
  {
    icon: Star,
    title: "Build Your Credit Score",
    description: "Every successful repayment improves your trust score, unlocking better loan terms",
    highlights: [
      "Track your reputation in real-time",
      "Get rewarded for good behavior",
      "Access premium loan offers",
    ],
    color: "from-yellow-500 to-orange-500",
    bgColor: "bg-yellow-50",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your financial data is protected with bank-level security and privacy controls",
    highlights: [
      "256-bit encryption",
      "You control who sees your data",
      "No hidden fees or charges",
    ],
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Clock,
    title: "Fast Loan Approval",
    description: "Get approved quickly based on your verified reputation and payment history",
    highlights: [
      "Instant credit decisions",
      "No lengthy paperwork",
      "Direct lender connections",
    ],
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
  },
]

export function BorrowerBenefitsSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Why borrowers choose Credlio
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Join thousands of borrowers who have built their credit reputation and accessed 
            better loan opportunities through our platform.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-gray-300 hover:shadow-xl"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 ${benefit.bgColor} opacity-50 transition-opacity group-hover:opacity-70`} />
              
              <CardHeader className="relative">
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${benefit.color} p-3 shadow-lg`}>
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
                <CardDescription className="text-base">
                  {benefit.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ul className="space-y-3">
                  {benefit.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <span className="font-medium">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Benefits Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Earn Badges</h3>
              <p className="mt-1 text-sm text-gray-600">
                Get recognized for timely payments
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
              <TrendingUp className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Better Rates</h3>
              <p className="mt-1 text-sm text-gray-600">
                Unlock lower interest with good history
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Trusted Network</h3>
              <p className="mt-1 text-sm text-gray-600">
                Connect with verified lenders
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <FileCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Simple Process</h3>
              <p className="mt-1 text-sm text-gray-600">
                Easy application and verification
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}