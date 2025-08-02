import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart3, 
  Users, 
  Lock, 
  CheckCircle,
  FileSearch,
  ShieldCheck,
  TrendingUp,
  Clock,
  Globe
} from "lucide-react"

const features = [
  {
    icon: FileSearch,
    title: "Comprehensive Credit Reports",
    description: "Access detailed borrower profiles with complete payment history, risk scores, and behavioral analytics",
    highlights: [
      "Real-time reputation scores",
      "Payment history analysis",
      "Risk assessment metrics",
    ],
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: ShieldCheck,
    title: "Trust Verification System",
    description: "Multi-layer verification process ensures you're dealing with legitimate, verified users",
    highlights: [
      "Identity verification",
      "Document authentication",
      "Blacklist screening",
    ],
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
  },
  {
    icon: TrendingUp,
    title: "Smart Risk Analytics",
    description: "Advanced algorithms analyze patterns and predict risk levels with high accuracy",
    highlights: [
      "Predictive risk modeling",
      "Automated scoring",
      "Trend analysis",
    ],
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Everything you need for confident lending
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Our platform provides comprehensive tools and data to help you make informed decisions
            and minimize risk in every transaction.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-gray-300 hover:shadow-xl"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 ${feature.bgColor} opacity-50 transition-opacity group-hover:opacity-70`} />
              
              <CardHeader className="relative">
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} p-3 shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ul className="space-y-3">
                  {feature.highlights.map((highlight, idx) => (
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

        {/* Additional Features Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
              <p className="mt-1 text-sm text-gray-600">
                Get instant notifications on borrower activities
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bank-grade Security</h3>
              <p className="mt-1 text-sm text-gray-600">
                256-bit encryption and compliance standards
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <Globe className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Wide Coverage</h3>
              <p className="mt-1 text-sm text-gray-600">
                Operating across multiple countries and regions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
              <Users className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Invite Borrowers</h3>
              <p className="mt-1 text-sm text-gray-600">
                Send secure invitations to your trusted clients
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}