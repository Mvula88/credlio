import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, Database, Key } from "lucide-react"
import Link from "next/link"

export default function SetupRequiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Setup Required
          </CardTitle>
          <CardDescription>
            Your Credlio application needs to be configured before it can run properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Environment Configuration Missing</AlertTitle>
            <AlertDescription>
              The application detected that required environment variables are not configured.
              Please follow the steps below to set up your application.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Setup Steps:</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">1. Configure Environment Variables</p>
                  <p className="text-sm text-muted-foreground">
                    Edit the <code className="bg-muted px-1 rounded">.env.local</code> file and replace the placeholder values with your actual credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">2. Set up Supabase</p>
                  <p className="text-sm text-muted-foreground">
                    Create a Supabase project and get your project URL and anon key from the project settings.
                  </p>
                  <a 
                    href="https://supabase.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Go to Supabase →
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">3. Configure Stripe (Optional)</p>
                  <p className="text-sm text-muted-foreground">
                    For payment processing, create a Stripe account and add your API keys.
                  </p>
                  <a 
                    href="https://stripe.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Go to Stripe →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Required Environment Variables:</p>
            <pre className="text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
STRIPE_SECRET_KEY=your_stripe_key (optional)
STRIPE_WEBHOOK_SECRET=your_webhook_secret (optional)`}
            </pre>
          </div>

          <div className="pt-4 space-y-3">
            <Link href="/IMPROVEMENTS.md" target="_blank">
              <Button variant="outline" className="w-full">
                View Setup Documentation
              </Button>
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              After updating your environment variables, restart the development server.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}