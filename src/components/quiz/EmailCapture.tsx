import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, User } from 'lucide-react';

interface EmailCaptureProps {
  onSubmit: (email: string, gender: string) => void;
}

export function EmailCapture({ onSubmit }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    
    if (!gender) {
      setError('Please select a gender');
      return;
    }
    
    setError('');
    onSubmit(email.trim(), gender);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Almost There!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Enter your email to receive your personalized collector profile and unlock exclusive insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Gender
          </Label>
          <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other" className="font-normal cursor-pointer">Other</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="prefer-not" id="prefer-not" />
              <Label htmlFor="prefer-not" className="font-normal cursor-pointer">Prefer not to say</Label>
            </div>
          </RadioGroup>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button type="submit" size="lg" className="w-full">
          See My Results
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          We'll never share your email. Unsubscribe anytime.
        </p>
      </form>
    </motion.div>
  );
}
