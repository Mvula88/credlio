"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlertTriangle, 
  XCircle, 
  DollarSign,
  History,
  Ban,
  Info
} from "lucide-react"

interface RiskyBorrowerWarningProps {
  totalOwed: number
  timesReported: number
  accountDeletions?: number
  lastDeleted?: string
  onProceed?: () => void
  onCancel?: () => void
}

export function RiskyBorrowerWarning({
  totalOwed,
  timesReported,
  accountDeletions = 0,
  lastDeleted,
  onProceed,
  onCancel
}: RiskyBorrowerWarningProps) {
  return (
    <Card className="border-red-500 shadow-lg">
      <CardHeader className="bg-red-50 border-b border-red-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-red-900 text-xl">
              ⚠️ Previous Account with Outstanding Debts Detected
            </CardTitle>
            <CardDescription className="text-red-700 mt-1">
              You cannot create a new account to evade your risky borrower status
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-4">
        <Alert className="bg-red-50 border-red-300">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900">Account Creation Blocked</AlertTitle>
          <AlertDescription className="text-red-800 mt-2">
            Our system has detected that you have previously been flagged as a risky borrower with outstanding debts. 
            Creating new accounts to avoid debt obligations is not permitted.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="h-5 w-5" />
            Your Previous Account Details:
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Total Amount Owed</p>
                <p className="font-bold text-red-600 text-lg">
                  ${totalOwed.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Times Reported</p>
                <p className="font-bold text-orange-600 text-lg">
                  {timesReported} {timesReported === 1 ? 'time' : 'times'}
                </p>
              </div>
            </div>
            
            {accountDeletions > 0 && (
              <div className="flex items-start gap-2">
                <Ban className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Account Deletion Attempts</p>
                  <p className="font-bold text-red-600 text-lg">
                    {accountDeletions}
                  </p>
                </div>
              </div>
            )}
            
            {lastDeleted && (
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Last Account Deleted</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(lastDeleted).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-300">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900">What You Need to Do</AlertTitle>
          <AlertDescription className="text-blue-800 mt-2">
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Log in to your existing account (password reset available if needed)</li>
              <li>Clear your outstanding debts with the lenders</li>
              <li>Request deregistration from the risky borrowers list</li>
              <li>Once cleared, you can use the platform normally</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
          <p className="text-sm text-yellow-900 font-medium flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Warning:</strong> Attempting to create multiple accounts or providing false information 
              may result in permanent ban from the platform and legal action.
            </span>
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Go to Login
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              alert("Please log in to your existing account and clear your debts first.")
              onCancel?.()
            }}
            className="flex-1"
            disabled
          >
            Cannot Create Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Component to show in profile deletion attempt
export function PreventDeletionWarning({ 
  totalOwed, 
  onClose 
}: { 
  totalOwed: number
  onClose: () => void 
}) {
  return (
    <Alert className="border-red-500 bg-red-50">
      <Ban className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-900">
        Account Deletion Blocked
      </AlertTitle>
      <AlertDescription className="text-red-800 mt-2 space-y-3">
        <p>
          You cannot delete your account while you have outstanding debts totaling 
          <strong className="text-red-900"> ${totalOwed.toLocaleString()}</strong>.
        </p>
        <p>
          Your risky borrower status will persist even if you attempt to delete your account. 
          The system will automatically reattach this status to any new account you create.
        </p>
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClose}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            I Understand
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}