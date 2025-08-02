'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Clock, User } from 'lucide-react';
import { getBorrowerRiskHistory } from '@/app/actions/risk-management';
import { Skeleton } from '@/components/ui/skeleton';

interface RiskHistoryEntry {
  id: string;
  action: 'marked_risky' | 'marked_improved';
  reason: string;
  performed_at: string;
  performed_by: {
    full_name: string;
    role: string;
  } | null;
}

interface RiskHistoryProps {
  borrowerId: string;
}

export function RiskHistory({ borrowerId }: RiskHistoryProps) {
  const [history, setHistory] = useState<RiskHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getBorrowerRiskHistory(borrowerId);
        setHistory(data as RiskHistoryEntry[]);
      } catch (error) {
        console.error('Error loading risk history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [borrowerId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Status History</CardTitle>
          <CardDescription>Track of all risk status changes</CardDescription>
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

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Status History</CardTitle>
          <CardDescription>Track of all risk status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No risk status changes recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Status History</CardTitle>
        <CardDescription>Track of all risk status changes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              <div className="mt-1">
                {entry.action === 'marked_risky' ? (
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-green-100 rounded-full">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {entry.action === 'marked_risky' 
                      ? 'Marked as Risky' 
                      : 'Marked as Improved'}
                  </span>
                  {entry.action === 'marked_risky' ? (
                    <Badge variant="destructive" className="text-xs">Risky</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Improved</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{entry.reason}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(entry.performed_at).toLocaleString()}</span>
                  </div>
                  {entry.performed_by && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>
                        {entry.performed_by.full_name} ({entry.performed_by.role})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}