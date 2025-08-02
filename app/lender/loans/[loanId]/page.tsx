import { getActiveLoanDetails } from '@/app/actions/active-loans';
import { LoanDetailsView } from '@/components/lender/loan-details-view';
import { notFound } from 'next/navigation';

export default async function LoanDetailsPage({ 
  params 
}: { 
  params: { loanId: string } 
}) {
  try {
    const { loan, payments } = await getActiveLoanDetails(params.loanId);
    
    if (!loan) {
      notFound();
    }

    return <LoanDetailsView loan={loan} payments={payments} />;
  } catch (error) {
    console.error('Error loading loan details:', error);
    notFound();
  }
}
