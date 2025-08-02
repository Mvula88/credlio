"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight, FileText, Users, Calculator } from "lucide-react"
import confetti from "canvas-confetti"

export default function SubscriptionSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Celebrate with confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }, [])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold">Welcome to Credlio!</h1>
        <p className="text-xl text-muted-foreground">
          Your subscription is now active. Let's get you started.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
          <CardDescription>
            Here are some things you can do with your new subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">Check Reports</h3>
              <p className="text-sm text-muted-foreground">
                View borrower reputation reports and credit history
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">Browse Marketplace</h3>
              <p className="text-sm text-muted-foreground">
                Find verified borrowers looking for loans
              </p>
            </div>

            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-3">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">Assess Risk</h3>
              <p className="text-sm text-muted-foreground">
                Use our tools to evaluate borrower affordability
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <Button size="lg" onClick={() => router.push("/lender/marketplace")}>
          Browse Marketplace
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Button size="lg" variant="outline" onClick={() => router.push("/lender/dashboard")}>
          Go to Dashboard
        </Button>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Need help getting started?</p>
        <Button variant="link" className="text-primary">
          View our getting started guide
        </Button>
      </div>
    </div>
  )
}
