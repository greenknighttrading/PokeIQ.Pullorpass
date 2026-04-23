import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface CreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfBu6m-D3xSrRyyKpOwqMRJ6WtGuE91IVK2KN9AOc3BJc5ISQ/viewform?usp=header';

export function CreditsModal({ open, onOpenChange }: CreditsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <DialogTitle className="text-xl">You're Out of Upload Credits</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed pt-2 space-y-4">
            <p>
              Thank you for trying PokeIQ — we're glad you found it valuable.
            </p>
            <p>
              You've used all available upload credits during the beta. For now, uploads are limited while we refine the product.
            </p>
            <p>
              Pro plans and additional upload options are coming soon.
            </p>
            <p>
              In the meantime, you can earn an extra upload credit by submitting feedback at the{' '}
              <a 
                href={FEEDBACK_FORM_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                feedback form
              </a>.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer">
              Submit Feedback
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
