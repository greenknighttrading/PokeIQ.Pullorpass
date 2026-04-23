import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

const FEEDBACK_SUBJECTS = [
  'Question about my results',
  'Feedback or suggestion',
  'Bug or issue',
  'Account / access question',
  'Other',
];

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message.trim()) {
      toast.error('Please select a subject and enter your feedback');
      return;
    }

    setIsSubmitting(true);
    // For now, just show success - can be connected to backend later
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Thank you for your feedback!');
    setSubject('');
    setMessage('');
    setOpen(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Feedback helps us improve so please let us know what you think
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject..." />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_SUBJECTS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback</Label>
            <Textarea
              id="message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full gap-2"
            disabled={isSubmitting || !subject || !message.trim()}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
