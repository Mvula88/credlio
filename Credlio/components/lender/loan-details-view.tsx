'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  User,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { BorrowerProfileHeader } from '@/components/borrower/borrower-profile-header';
import { RecordPaymentDialog } from './record-payment-dialog';
import { DeregisterRiskyButton } from './deregister-risky-button';
import { updateDocumentVerification, updateLoanStatus } from '@/app/actions/active-loans';
import { useToast } from '@/components/ui/use-toast';

interface LoanDetailsViewProps {
  loan: any;
  payments: any[];
}

export function LoanDetailsView({ loan, payments }: LoanDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [documents, setDocuments] = useState(loan.documents_verified || {});

  const repaymentProgress = (loan.total_amount_paid / loan.total_amount_due) * 100;

  const handleDocumentToggle = async (docType: string, checked: boolean) => {
    try {
      await updateDocumentVerification(loan.id, docType, checked);
      setDocuments({ ...documents, [docType]: checked });
      toast({
        title: 'Document verification updated',
        description: `${docType} has been marked as ${checked ? 'verified' : 'unverified'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update document verification',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsDefaulted = async () => {
    if (confirm('Are you sure you want to mark this loan as defaulted?')) {
      try {
        await updateLoanStatus(loan.id, 'defaulted', 'Marked as defaulted by lender');
        toast({
          title: 'Loan marked as defaulted',
          description: 'The loan status has been updated.',
        });
        router.refresh();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to update loan status',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/lender/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Loan Details</h1>
            <p className="text-muted-foreground">
              Manage and track this lending relationship
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loan.status === 'active' && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMarkAsDefaulted}
              >
                Mark as Defaulted
              </Button>
              <Button
                onClick={() => setShowPaymentDialog(true)}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Borrower Profile */}
      <BorrowerProfileHeader
        borrower={{
          ...loan.borrower,
          borrower_profile: loan.borrower.borrower_profile?.[0]
        }}
        isLender={true}
        onRiskStatusChange={() => router.refresh()}
      />

      {/* Loan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loan Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                ${loan.amount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Due: ${loan.total_amount_due.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repayment Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={repaymentProgress} />
              <p className="text-sm">
                ${loan.total_amount_paid.toLocaleString()} / 
                ${loan.total_amount_due.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loan Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm">
                {new Date(loan.start_date).toLocaleDateString()} - 
                {new Date(loan.expected_end_date).toLocaleDateString()}
              </p>
              <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                {loan.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="payments">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="payments">Payment History</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="details">Loan Details</TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Payment History</h3>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No payments recorded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              ${payment.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{payment.payment_method}</p>
                          {payment.receipt_number && (
                            <p className="text-xs text-muted-foreground">
                              Receipt: {payment.receipt_number}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Document Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Check the documents you have verified privately
                </p>
                <div className="space-y-3">
                  {Object.entries({
                    national_id: 'National ID',
                    proof_of_income: 'Proof of Income',
                    collateral_docs: 'Collateral Documents',
                    guarantor_docs: 'Guarantor Documents',
                    agreement_signed: 'Loan Agreement',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={documents[key] || false}
                        onCheckedChange={(checked) => 
                          handleDocumentToggle(key, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Loan Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Purpose
                    </dt>
                    <dd className="text-sm mt-1">
                      {loan.loan_request?.purpose || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Interest Rate
                    </dt>
                    <dd className="text-sm mt-1">
                      {loan.interest_rate || 0}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Duration
                    </dt>
                    <dd className="text-sm mt-1">
                      {loan.duration_months} months
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Last Payment
                    </dt>
                    <dd className="text-sm mt-1">
                      {loan.last_payment_date 
                        ? new Date(loan.last_payment_date).toLocaleDateString()
                        : 'No payments yet'}
                    </dd>
                  </div>
                </dl>
                {loan.notes && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Notes
                    </dt>
                    <dd className="text-sm mt-1 p-3 bg-muted rounded">
                      {loan.notes}
                    </dd>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        loanId={loan.id}
        onSuccess={() => {
          setShowPaymentDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}