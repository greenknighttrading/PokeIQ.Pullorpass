import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles } from 'lucide-react';

interface PremiumFilterModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PremiumFilterModal({ open, onOpenChange }: PremiumFilterModalProps) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-violet-500/30">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Filters are a Premium feature</DialogTitle>
          <DialogDescription>
            Upgrade to PokeIQ Premium to fine-tune your Pull or Pass feed by price, set, and era.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 pt-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-300" /> Unlimited swipes</li>
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-300" /> Custom filters (price, set, era)</li>
          <li className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-300" /> Advanced collector insights</li>
        </ul>

        <Button
          type="button"
          onClick={() => { onOpenChange(false); navigate('/premium'); }}
          className="w-full mt-2 bg-gradient-to-r from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 text-white"
        >
          <Crown className="w-4 h-4 mr-2" /> Go Premium
        </Button>
      </DialogContent>
    </Dialog>
  );
}