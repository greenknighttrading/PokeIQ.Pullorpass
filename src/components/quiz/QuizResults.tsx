import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  PersonalityResult, 
  PRIMARY_TYPE_INFO, 
  MODIFIER_INFO 
} from '@/lib/personalityEngine';
import { 
  Shield, Vote, Flame, Briefcase, ScrollText,
  Lock, TrendingUp, PieChart, Target, BarChart3,
  ChevronRight, CheckCircle2, Sparkles, AlertCircle,
  Zap, Wallet, Trophy, Scale, Calculator, FileText,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QuizResultsProps {
  result: PersonalityResult;
}

const TYPE_ICONS = {
  Sentinel: Shield,
  Politician: Vote,
  Purist: Flame,
  Hustler: Briefcase,
  Archivist: ScrollText,
};

const ERA_LABELS = {
  vintage: 'Vintage',
  classic: 'Classic',
  modern: 'Modern',
  ultraModern: 'Ultra Modern',
  current: 'Current',
};

export function QuizResults({ result }: QuizResultsProps) {
  const typeInfo = PRIMARY_TYPE_INFO[result.primaryType];
  const TypeIcon = TYPE_ICONS[result.primaryType];

  // Save personality result to localStorage for budget tool
  useEffect(() => {
    localStorage.setItem('personalityResult', JSON.stringify(result));
  }, [result]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Hero Type Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-6 p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30">
          <TypeIcon className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-primary font-medium">
            Your Collector Personality
          </p>
          <h1 className="text-4xl font-bold text-foreground">
            {typeInfo.emoji} The {result.primaryType}
          </h1>
          <p className="text-lg text-primary">{typeInfo.tagline}</p>
        </div>
        
        {/* Elaborate Description */}
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-base">
          {typeInfo.fullDescription}
        </p>
        
        {/* Modifiers with readable labels */}
        {result.modifiers.length > 0 && (
          <div className="flex justify-center gap-3 pt-4 flex-wrap">
            {result.modifiers.map((modifier) => (
              <span
                key={modifier}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 text-accent text-sm font-medium border border-accent/20"
              >
                {MODIFIER_INFO[modifier].emoji} {MODIFIER_INFO[modifier].label}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Section 1: PERSONALITY */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Personality
          </h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            {typeInfo.personalityProfile.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Key Collecting Traits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Key Collecting Traits
          </h3>
          <p className="text-sm text-muted-foreground mb-4">The tendencies that most influence your decisions</p>
          <div className="flex flex-wrap gap-2">
            {typeInfo.collectingTraits.map((trait, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
              >
                {trait}
              </span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Your Strengths as a Collector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
      <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Your Strengths as a Collector
          </h3>
          <div className="space-y-4">
            {typeInfo.strengths.map((strength, i) => (
              <div key={i}>
                <h4 className="font-semibold text-foreground">{strength.title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{strength.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Potential Blind Spots */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
      <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Potential Blind Spots
          </h3>
          <div className="space-y-4">
            {typeInfo.blindSpots.map((spot, i) => (
              <div key={i}>
                <h4 className="font-semibold text-foreground">{spot.title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{spot.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Your Growth as a Collector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Your Growth as a Collector
          </h3>
          <p className="text-sm text-muted-foreground mb-3">How to level up without losing your identity</p>
          <p className="text-muted-foreground leading-relaxed">{typeInfo.growth}</p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Your best collections will always reflect who you are—thoughtful, historically grounded, and intentional. The goal isn't to chase every trend, but to build something that still feels meaningful years from now.
          </p>
        </Card>
      </motion.div>

      {/* How You Collect Best / What Drains You */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-success" />
            How You Collect Best
          </h3>
          <p className="text-sm text-muted-foreground mb-3">Environments and habits that suit you</p>
          <ul className="space-y-2">
            {typeInfo.collectsBest.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            What Drains You
          </h3>
          <ul className="space-y-2 mt-6">
            {typeInfo.drains.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0">×</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* Allocations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* Product Allocation */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Recommended Product Allocation
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Sealed', value: result.productAllocation.sealedPct, color: 'bg-primary' },
              { label: 'Graded', value: result.productAllocation.gradedPct, color: 'bg-accent' },
              { label: 'Raw', value: result.productAllocation.rawPct, color: 'bg-success' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Era Allocation */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Recommended Era Allocation
          </h3>
          <div className="space-y-4">
            {Object.entries(result.eraAllocation).map(([era, value], i) => (
              <div key={era} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{ERA_LABELS[era as keyof typeof ERA_LABELS]}</span>
                  <span className="font-medium text-foreground">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                    className="h-full rounded-full bg-primary"
                    style={{ opacity: 0.4 + (i * 0.15) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Why You Got This */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Why You Got This
          </h3>
          <ul className="space-y-3">
            {result.explanations.map((explanation, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-sm font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                {explanation}
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* One Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6 bg-accent/5 border-accent/20">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Your Next Move
          </h3>
          <p className="text-muted-foreground">{result.oneAction}</p>
        </Card>
      </motion.div>

      {/* Strengths & Trade-offs (moved to bottom) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="grid md:grid-cols-2 gap-4"
      >
        <Card className="p-5 bg-success/10 border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <span className="font-semibold text-success">Core Strength</span>
          </div>
          <p className="text-foreground">{typeInfo.strength}</p>
        </Card>
        <Card className="p-5 bg-warning/10 border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-warning" />
            <span className="font-semibold text-warning">Trade-off</span>
          </div>
          <p className="text-foreground">{typeInfo.tradeoff}</p>
        </Card>
      </motion.div>

      {/* Locked Premium Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="p-6 border-2 border-primary/40 bg-gradient-to-b from-card to-primary/5">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 border border-primary/30">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-foreground">Unlock Full Portfolio Intelligence</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                Get powerful tools to analyze, budget, and optimize your collection.
              </p>
            </div>
            
            {/* Feature List */}
            <div className="text-left max-w-md mx-auto space-y-2 py-4">
              {[
                'Upload your actual portfolio for personalized insights',
                'Collection budgeting tool with pie chart visualization',
                'Smart Rebalancer to reach target allocations',
                'Top winners & underperformers analysis',
                'Action items tailored to your goals',
                'Era & product allocation tracking',
                'Portfolio health score with detailed breakdown',
                'Cost basis tracking & ROI calculations',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>

            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Sign Up
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="text-center pt-4"
      >
        <Link to="/">
          <Button variant="outline" size="lg" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Learn More About PokeIQ
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}