'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RiskStatusBadge } from './risk-status-badge';
import { DeregisterRiskyButton } from '@/components/lender/deregister-risky-button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, Mail } from 'lucide-react';

interface BorrowerProfileHeaderProps {
  borrower: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    country?: { name: string };
    created_at: string;
    profile_picture_url?: string;
    borrower_profile?: {
      is_risky: boolean;
      was_risky_before: boolean;
      reputation_score: number;
      total_loans_requested: number;
      loans_repaid: number;
      loans_defaulted: number;
    };
  };
  isLender?: boolean;
  onRiskStatusChange?: () => void;
}

export function BorrowerProfileHeader({ 
  borrower, 
  isLender = false,
  onRiskStatusChange 
}: BorrowerProfileHeaderProps) {
  const initials = borrower.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  const borrowerProfile = borrower.borrower_profile;
  const reputationScore = borrowerProfile?.reputation_score || 50;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={borrower.profile_picture_url} alt={borrower.full_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{borrower.full_name}</CardTitle>
              <div className="flex items-center gap-2">
                {borrowerProfile && (
                  <RiskStatusBadge
                    isRisky={borrowerProfile.is_risky}
                    wasRiskyBefore={borrowerProfile.was_risky_before}
                    size="md"
                  />
                )}
                <Badge variant="outline" className={getScoreColor(reputationScore)}>
                  Score: {reputationScore}/100
                </Badge>
              </div>
            </div>
          </div>
          {isLender && borrowerProfile?.is_risky && (
            <DeregisterRiskyButton
              borrowerId={borrower.id}
              borrowerName={borrower.full_name}
              onSuccess={onRiskStatusChange}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{borrower.email}</span>
            </div>
            {borrower.phone_number && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{borrower.phone_number}</span>
              </div>
            )}
            {borrower.country && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{borrower.country.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Member since {new Date(borrower.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          {borrowerProfile && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Loan Statistics</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Requested</p>
                  <p className="font-semibold">{borrowerProfile.total_loans_requested}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Repaid</p>
                  <p className="font-semibold text-green-600">{borrowerProfile.loans_repaid}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Defaulted</p>
                  <p className="font-semibold text-red-600">{borrowerProfile.loans_defaulted}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}