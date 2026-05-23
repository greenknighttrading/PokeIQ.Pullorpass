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

import investorImg from '@/assets/personalities/investor.jpg';
import archivistImg from '@/assets/personalities/archivist.jpg';
import dreamerImg from '@/assets/personalities/dreamer.jpg';
import flipperImg from '@/assets/personalities/flipper.jpg';
import analystImg from '@/assets/personalities/analyst.jpg';
import hunterImg from '@/assets/personalities/hunter.jpg';
import explorerImg from '@/assets/personalities/explorer.jpg';
import curatorImg from '@/assets/personalities/curator.jpg';
import diplomatImg from '@/assets/personalities/diplomat.jpg';
import gamblerImg from '@/assets/personalities/gambler.jpg';
import showmanImg from '@/assets/personalities/showman.jpg';
import minimalistImg from '@/assets/personalities/minimalist.jpg';

const TYPE_IMAGES: Record<PersonalityType, string> = {
  Investor: investorImg,
  Archivist: archivistImg,
  Dreamer: dreamerImg,
  Flipper: flipperImg,
  Analyst: analystImg,
  Hunter: hunterImg,
  Explorer: explorerImg,
  Curator: curatorImg,
  Diplomat: diplomatImg,
  Gambler: gamblerImg,
  Showman: showmanImg,
  Minimalist: minimalistImg,
};

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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
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
                  className="text-left group focus:outline-none"
                >
                  <Card className="h-full overflow-hidden border-border/60 hover:border-primary/60 transition-all duration-300 cursor-pointer group-hover:-translate-y-1 group-hover:shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.35)]">
                    <div className="aspect-[4/5] overflow-hidden bg-muted/30 relative">
                      <img
                        src={TYPE_IMAGES[type]}
                        alt={`${type} collector personality illustration`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      {/* Gradient overlay so the name overlaps art bottom */}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/85 to-transparent" />

                      {/* Name + tagline overlay on art */}
                      <div className="absolute inset-x-0 bottom-0 p-4 pb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 backdrop-blur-sm">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <h3 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight leading-none text-foreground">
                            {type}
                          </h3>
                        </div>
                        <p className="text-sm italic text-primary font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
                          "{t.philosophy}"
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pt-3 pb-5">
                      <p className="text-[13px] leading-relaxed text-foreground/80 line-clamp-3 min-h-[4.2rem]">
                        {t.tagline}
                      </p>
                    </div>
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
                  <div className="-mx-6 -mt-6 mb-2 aspect-[16/9] overflow-hidden bg-muted/30 relative">
                    <img
                      src={TYPE_IMAGES[selected]}
                      alt={`${selected} illustration`}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  </div>
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