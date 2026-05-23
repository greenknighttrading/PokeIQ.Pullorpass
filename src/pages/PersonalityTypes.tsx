import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PersonalityType,
  PERSONALITY_INFO,
} from '@/lib/personalityEngine';
import {
  PiggyBank, ScrollText, Heart, Zap, Calculator, Target,
  Compass, LayoutGrid, Scale, Dice5, Crown, Leaf,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Seo } from '@/components/seo/Seo';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';

const TYPE_ICONS: Record<PersonalityType, React.ComponentType<{ className?: string }>> = {
  Investor: PiggyBank,
  Archivist: ScrollText,
  Dreamer: Heart,
  Flipper: Zap,
  Analyst: Calculator,
  Hunter: Target,
  Explorer: Compass,
  Curator: LayoutGrid,
  Diplomat: Scale,
  Gambler: Dice5,
  Showman: Crown,
  Minimalist: Leaf,
};

const TYPES = Object.keys(PERSONALITY_INFO) as PersonalityType[];

export default function PersonalityTypes() {
  const [selected, setSelected] = useState<PersonalityType | null>(null);
  const info = selected ? PERSONALITY_INFO[selected] : null;
  const SelectedIcon = selected ? TYPE_ICONS[selected] : null;

  return (
    <>
      <Seo
        title="12 Collector Personality Types | PokeIQ"
        description="Explore all 12 Pokémon collector personality archetypes — from the patient Investor to the thrill-seeking Gambler. Discover the psychology behind how collectors collect."
      />

      <div className="min-h-screen bg-background">
        <GlobalNavBar />

        <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              The 12 Collector Personality Types
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every collector has a tribe. Tap any type to explore the psychology, strengths, blind spots, and growth path behind it.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {TYPES.map((type, i) => {
              const t = PERSONALITY_INFO[type];
              const Icon = TYPE_ICONS[type];
              return (
                <motion.button
                  key={type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(type)}
                  className="text-left group"
                >
                  <Card className="h-full p-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 border border-primary/20">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground">{type}</h3>
                    </div>
                    <p className="text-xs italic text-primary/80 mb-2">"{t.philosophy}"</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{t.tagline}</p>
                  </Card>
                </motion.button>
              );
            })}
          </div>
        </main>

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selected && info && SelectedIcon && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 border border-primary/30">
                      <SelectedIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">{selected}</DialogTitle>
                      <p className="text-xs italic text-primary/80">"{info.philosophy}"</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 text-sm">
                  <p className="text-foreground/90">{info.tagline}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {info.coreTraits.map((trait) => (
                      <span key={trait} className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        {trait}
                      </span>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Summary</h4>
                    <p className="text-foreground/80">{info.summary}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                      <h4 className="text-xs uppercase tracking-wider text-success mb-1">Strength</h4>
                      <p className="text-foreground/80 text-xs">{info.strengthLong}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                      <h4 className="text-xs uppercase tracking-wider text-warning mb-1">Weakness</h4>
                      <p className="text-foreground/80 text-xs">{info.weaknessLong}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Core Identity</h4>
                    <p className="text-foreground/80">{info.fullProfile.coreIdentity}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Collecting Mindset</h4>
                    <p className="text-foreground/80">{info.fullProfile.collectingMindset}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Inner World</h4>
                    <p className="text-foreground/80">{info.fullProfile.innerWorld}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Blind Spots</h4>
                    <p className="text-foreground/80">{info.fullProfile.blindSpots}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <h4 className="text-xs uppercase tracking-wider text-primary mb-1.5">Growth Path</h4>
                    <p className="text-foreground/80">{info.fullProfile.growthPath}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Famous Behavior</h4>
                      <p className="text-foreground/80 text-xs italic">{info.famousBehavior}</p>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</h4>
                      <p className="text-foreground/80 text-xs">{info.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}