'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

interface RiskStatusBadgeProps {
  isRisky: boolean;
  wasRiskyBefore: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskStatusBadge({ isRisky, wasRiskyBefore, size = 'md' }: RiskStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (isRisky) {
    return (
      <Badge 
        variant="destructive" 
        className={`${sizeClasses[size]} flex items-center gap-1`}
      >
        <AlertTriangle className={iconSizes[size]} />
        Risky Borrower
      </Badge>
    );
  }

  if (wasRiskyBefore) {
    return (
      <Badge 
        variant="secondary" 
        className={`${sizeClasses[size]} flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200`}
      >
        <TrendingUp className={iconSizes[size]} />
        Improved Borrower
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} flex items-center gap-1 border-green-200 text-green-700`}
    >
      <CheckCircle className={iconSizes[size]} />
      Good Standing
    </Badge>
  );
}