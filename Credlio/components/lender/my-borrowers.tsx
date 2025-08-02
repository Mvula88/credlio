'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  DollarSign,
  FileText,
  ChevronRight
} from 'lucide-react';
import { getLenderPortfolio } from '@/app/actions/active-loans';
import { useRouter } from 'next/navigation';
import { RiskStatusBadge } from '@/components/borrower/risk-status-badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ActiveLoan {
  id: string;
  borrower_id: string;
  borrower_name: string;
  borrower_email: string;
  borrower_phone: string;
  amount: number;
  total_amount_due: number;
  total_amount_paid: number;
  repayment_progress: number;
  start_date: string;
  expected_end_date: string;
  status: 'active' | 'completed' | 'defaulted';
  loan_purpose: string;
  reputation_score: number;
  is_risky: boolean;
  was_risky_before: boolean;
  last_payment_date: string | null;
}

export function MyBorrowers() {
  const router = useRouter();
  const [loans, setLoans] = useState<ActiveLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'defaulted'>('all');

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      const data = await getLenderPortfolio();
      setLoans(data as ActiveLoan[]);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (activeTab === 'all') return true;
    return loan.status === activeTab;
  });

  const stats = {
    total: loans.length,
    active: loans.filter(l => l.status === 'active').length,
    completed: loans.filter(l => l.status === 'completed').length,
    defaulted: loans.filter(l => l.status === 'defaulted').length,
    totalLent: loans.reduce((sum, l) => sum + l.amount, 0),
    totalRecovered: loans.reduce((sum, l) => sum + l.total_amount_paid, 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'defaulted':
        return <Badge variant="destructive">Defaulted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Borrowers</CardTitle>
          <CardDescription>Loading your portfolio...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Borrowers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Lent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                ${stats.totalLent.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recovered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                ${stats.totalRecovered.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Borrowers List */}
      <Card>
        <CardHeader>
          <CardTitle>My Borrowers</CardTitle>
          <CardDescription>
            Manage and track all your lending relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="defaulted">Defaulted ({stats.defaulted})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No borrowers found in this category
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Loan Details</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{loan.borrower_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {loan.borrower_email}
                              </div>
                              <div className="flex items-center gap-2">
                                <RiskStatusBadge
                                  isRisky={loan.is_risky}
                                  wasRiskyBefore={loan.was_risky_before}
                                  size="sm"
                                />
                                <Badge variant="outline" className="text-xs">
                                  Score: {loan.reputation_score}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                ${loan.amount.toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {loan.loan_purpose}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(loan.start_date).toLocaleDateString()} - 
                                {new Date(loan.expected_end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Progress value={loan.repayment_progress} />
                              <div className="text-sm">
                                ${loan.total_amount_paid.toLocaleString()} / 
                                ${loan.total_amount_due.toLocaleString()}
                              </div>
                              {loan.last_payment_date && (
                                <div className="text-xs text-muted-foreground">
                                  Last payment: {new Date(loan.last_payment_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(loan.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/lender/loans/${loan.id}`)}
                            >
                              View Details
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}