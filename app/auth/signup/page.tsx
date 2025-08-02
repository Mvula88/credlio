export const dynamic = "force-dynamic"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, CreditCard } from "lucide-react"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Choose Your Account Type</CardTitle>
          <CardDescription>
            Select how you want to use Credlio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/signup/lender" className="block">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
              <Users className="h-8 w-8" />
              <div>
                <p className="font-semibold">I want to Lend</p>
                <p className="text-sm text-muted-foreground">
                  Verify borrowers and manage loans
                </p>
              </div>
            </Button>
          </Link>
          
          <Link href="/signup/borrower" className="block">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
              <CreditCard className="h-8 w-8" />
              <div>
                <p className="font-semibold">I want to Borrow</p>
                <p className="text-sm text-muted-foreground">
                  Build your reputation and get loans
                </p>
              </div>
            </Button>
          </Link>
          
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
