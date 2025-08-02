'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DeregisterRiskyButtonProps {
  borrowerId: string;
  borrowerName: string;
  onSuccess?: () => void;
}

export function DeregisterRiskyButton({ 
  borrowerId, 
  borrowerName, 
  onSuccess 
}: DeregisterRiskyButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Full loan repayment completed');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDeregister = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/borrower/mark-improved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowerId,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deregister borrower');
      }

      toast({
        title: 'Success',
        description: `${borrowerName} has been removed from the risky borrowers list.`,
      });

      setOpen(false);
      setReason('Full loan repayment completed');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deregister borrower',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Remove from Risky List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remove from Risky Borrowers List</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{borrowerName}</strong> from the risky borrowers list? 
            This action will mark them as an "Improved Borrower" while keeping their full history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for removal</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for removing from risky list..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDeregister}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Removal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}