import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users, Gift, Share2 } from 'lucide-react';

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  completedReferrals: number;
  rewardCredits: number;
}

export function InviteFriendsModal({ open, onOpenChange, userId, completedReferrals, rewardCredits }: InviteFriendsModalProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://pokeiq.com/swipe?ref=${userId}`;

  const shareData = {
    title: 'PokeIQ — Pull or Pass',
    text: `Join me on PokeIQ and help train the Collector DNA. Use my link to sign up!`,
    url: link,
  };

  const onShare = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      return;
    }
    onCopy();
  };

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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Invite Friends, Earn Swipes</DialogTitle>
          <DialogDescription>
            Share your link. When a friend signs up, you get {rewardCredits} credits — redeemable for {rewardCredits} swipes.
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
            <Button type="button" onClick={onShare} className="shrink-0 gap-1.5">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={onCopy} className="w-full gap-1.5">
            {copied ? (<><Check className="w-4 h-4" /> Copied!</>) : (<><Copy className="w-4 h-4" /> Copy Link</>)}
          </Button>

          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm border-border bg-muted/40 text-muted-foreground">
            <Users className="w-4 h-4 text-primary" />
            <span>
              <span className="text-foreground font-semibold">{completedReferrals}</span> friend{completedReferrals === 1 ? '' : 's'} joined so far
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Credits land in your account as soon as they finish signing up — head back to the Training Lab to redeem them for swipes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
