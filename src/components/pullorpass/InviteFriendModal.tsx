import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, Lock } from 'lucide-react';

interface InviteFriendModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  completedReferrals: number;
}

export function InviteFriendModal({ open, onOpenChange, userId, completedReferrals }: InviteFriendModalProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://pokeiq.com/swipe?ref=${userId}`;
  const unlocked = completedReferrals > 0;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Unlock Filters</DialogTitle>
          <DialogDescription>
            Invite a friend to Pull or Pass and unlock full filter access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Your referral link
          </label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs bg-background"
            />
            <Button
              type="button"
              onClick={onCopy}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shrink-0"
            >
              {copied ? (<><Check className="w-4 h-4 mr-1" /> Copied!</>) : (<><Copy className="w-4 h-4 mr-1" /> Copy Link</>)}
            </Button>
          </div>

          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            unlocked
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-border bg-muted/40 text-muted-foreground'
          }`}>
            <Users className="w-4 h-4" />
            {unlocked
              ? <span className="font-semibold">1 friend joined — Filters Unlocked ✓</span>
              : <span>0 / 1 friends joined</span>}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Share your link. When a friend signs up using it, your filters unlock instantly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}