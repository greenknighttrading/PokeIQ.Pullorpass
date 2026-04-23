import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Shield,
  ChevronRight,
  PieChart,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useSimulator, TimeHorizon, Preset } from './SimulatorContext';
import { cn } from '@/lib/utils';

const TIME_HORIZONS: { value: TimeHorizon; label: string }[] = [
  { value: 12, label: '12 months' },
  { value: 24, label: '24 months' },
  { value: 36, label: '36 months' },
];

const PRESETS: { value: Preset; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservative', description: 'Heavy sealed, vintage focus' },
  { value: 'balanced', label: 'Balanced', description: 'Mix of all asset types' },
  { value: 'aggressive', label: 'Aggressive', description: 'Graded focus, modern era' },
  { value: 'custom', label: 'Custom', description: 'Build your own' },
];

export default function SimulatorOverview() {
  const { 
    state, 
    setState, 
    healthScore, 
    statusTags, 
    totalInvested, 
    yearlySpend,
    topLevelValid,
    eraValid,
    applyPreset,
  } = useSimulator();

  const isValid = topLevelValid && eraValid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Simulated
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your ideal collection allocation
          </p>
        </div>
      </div>

      {/* Inputs Section */}
      <Card className="p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Budget & Timeline
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Monthly Budget */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Monthly Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={state.monthlyBudget}
                onChange={(e) => setState(prev => ({ 
                  ...prev, 
                  monthlyBudget: Math.max(0, parseInt(e.target.value) || 0) 
                }))}
                className="pl-7"
                min={0}
              />
            </div>
          </div>

          {/* Time Horizon */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Time Horizon
            </label>
            <div className="flex gap-2">
              {TIME_HORIZONS.map(horizon => (
                <Button
                  key={horizon.value}
                  variant={state.timeHorizon === horizon.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, timeHorizon: horizon.value }))}
                  className="flex-1"
                >
                  {horizon.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preset */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(preset => (
                <Button
                  key={preset.value}
                  variant={state.preset === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyPreset(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats & Health Score */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Planned Total */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Planned Total Invested</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${totalInvested.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Over {state.timeHorizon} months
          </p>
        </Card>

        {/* Monthly Spend */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Monthly Spend</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${state.monthlyBudget.toLocaleString()}
          </p>
        </Card>

        {/* Yearly Spend */}
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Yearly Spend</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${yearlySpend.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/simulator/assets">
          <Card className="p-5 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <PieChart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Asset Type Allocation</h3>
                  <p className="text-sm text-muted-foreground">Sealed, Graded, Raw breakdown</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            {topLevelValid && (
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-muted-foreground">Sealed: <span className="text-foreground font-medium">{state.topLevel.sealed}%</span></span>
                <span className="text-muted-foreground">Graded: <span className="text-foreground font-medium">{state.topLevel.graded}%</span></span>
                <span className="text-muted-foreground">Raw: <span className="text-foreground font-medium">{state.topLevel.raw}%</span></span>
              </div>
            )}
          </Card>
        </Link>

        <Link to="/simulator/eras">
          <Card className="p-5 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Era Allocation</h3>
                  <p className="text-sm text-muted-foreground">Vintage to Current distribution</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>
            {eraValid && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="text-muted-foreground">Vintage: <span className="text-foreground font-medium">{state.era.vintage}%</span></span>
                <span className="text-muted-foreground">Classic: <span className="text-foreground font-medium">{state.era.classic}%</span></span>
                <span className="text-muted-foreground">Modern+: <span className="text-foreground font-medium">{state.era.modern + state.era.ultraModern + state.era.current}%</span></span>
              </div>
            )}
          </Card>
        </Link>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-secondary/30 border-border">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> This is a planning tool. All projections are based on your inputs and do not represent actual holdings. 
          Upload your real portfolio to compare plan vs reality.
        </p>
      </Card>
    </div>
  );
}
