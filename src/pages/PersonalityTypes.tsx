import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PersonalityType,
  PERSONALITY_INFO,
} from '@/lib/personalityEngine';
import {
  PiggyBank, ScrollText, Heart, Zap, Calculator, Target,
  Compass, LayoutGrid, Mountain, Dice5, Crown, Leaf,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Seo } from '@/components/seo/Seo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

import investorImg from '@/assets/personalities/investor.jpg';
import archivistImg from '@/assets/personalities/archivist.jpg';
import dreamerImg from '@/assets/personalities/dreamer.jpg';
import flipperImg from '@/assets/personalities/flipper.jpg';
import analystImg from '@/assets/personalities/analyst.jpg';
import hunterImg from '@/assets/personalities/hunter.jpg';
import explorerImg from '@/assets/personalities/explorer.jpg';
import curatorImg from '@/assets/personalities/curator.jpg';
import monkImg from '@/assets/personalities/monk.jpg';
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
  Monk: monkImg,
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
  Monk: Mountain,
  Gambler: Dice5,
  Showman: Crown,
  Minimalist: Leaf,
};

const TYPES = Object.keys(PERSONALITY_INFO) as PersonalityType[];

const TYPE_TRAINERS: Record<PersonalityType, string> = {
  Investor: 'Steven Stone',
  Archivist: 'Cynthia',
  Dreamer: 'Lillie',
  Flipper: 'Raihan',
  Analyst: 'Clemont',
  Hunter: 'Blue',
  Explorer: 'Red',
  Curator: 'Lenora',
  Monk: 'Korrina',
  Gambler: 'Volkner',
  Showman: 'Leon',
  Minimalist: 'N',
};

// Per-type accent color (hex). Used for icon badge, philosophy text, and trainer label.
const TYPE_ACCENTS: Record<PersonalityType, string> = {
  Investor: '#34d399',   // emerald
  Archivist: '#a78bfa',  // violet
  Dreamer: '#60a5fa',    // blue
  Flipper: '#fbbf24',    // amber
  Analyst: '#22d3ee',    // cyan
  Hunter: '#f87171',     // red
  Explorer: '#4ade80',   // green
  Curator: '#c084fc',    // purple
  Monk: '#2dd4bf',       // teal
  Gambler: '#fb923c',    // orange
  Showman: '#e879f9',    // fuchsia
  Minimalist: '#5eead4', // mint
};

function Pokeball({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <path d="M1 12a11 11 0 0 1 22 0H1Z" fill="#e63946" stroke="#111" strokeWidth="1.5" />
      <line x1="1" y1="12" x2="23" y2="12" stroke="#111" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.2" fill="#fff" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

export default function PersonalityTypes() {
  const [selected, setSelected] = useState<PersonalityType | null>(null);
  const info = selected ? PERSONALITY_INFO[selected] : null;
  const SelectedIcon = selected ? TYPE_ICONS[selected] : null;

  return (
    <>
      <Seo
        title="Collector Types | PokeIQ"
        description="Explore all 12 Pokémon collector personality archetypes — from the patient Investor to the thrill-seeking Gambler. Discover the psychology behind how collectors collect."
      />

      <div className="min-h-screen bg-background">
        <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="mb-10 grid md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Collector Personality Types
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Every collector has a tribe. Tap any type to explore the psychology, strengths, blind spots, and growth path behind it.
              </p>
            </div>
            <div className="md:text-right">
              <Link to="/test" className="inline-block group">
                <Button
                  size="lg"
                  className="h-auto py-5 px-7 text-base font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_15px_50px_-10px_hsl(var(--primary)/0.8)] transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Take the Test
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2 max-w-[260px] md:ml-auto">
                  Just <span className="text-primary font-semibold">30 quick questions</span> to discover exactly how you collect.
                </p>
              </Link>
            </div>
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
                  <Card className="h-full flex flex-col overflow-hidden bg-card border-border/60 hover:border-primary/60 transition-all duration-300 cursor-pointer group-hover:-translate-y-1 group-hover:shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.35)]">
                    {/* Header: icon + name + philosophy */}
                    <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/40 flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-2xl font-extrabold tracking-tight leading-none text-foreground">
                          {type}
                        </h3>
                        <p className="mt-1.5 text-xs italic text-primary font-medium leading-snug line-clamp-2">
                          "{t.philosophy}"
                        </p>
                      </div>
                    </div>

                    {/* Artwork */}
                    <div className="px-3">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted/30">
                        <img
                          src={TYPE_IMAGES[type]}
                          alt={`${type} collector personality illustration`}
                          loading="lazy"
                          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="px-4 pt-3 pb-3 flex-1">
                      <p className="text-sm leading-relaxed text-foreground/85 line-clamp-3">
                        {t.tagline}
                      </p>
                    </div>

                    {/* Divider + trainer footer */}
                    <div className="mx-4 border-t border-border/60" />
                    <div className="px-4 py-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-primary font-medium leading-tight">
                          Associated Trainer:
                        </p>
                        <p className="text-base font-bold text-foreground leading-tight mt-0.5 truncate">
                          {TYPE_TRAINERS[type]}
                        </p>
                      </div>
                      <Pokeball className="w-7 h-7 flex-shrink-0" />
                    </div>
                  </Card>
                </motion.button>
              );
            })}
          </div>
        </main>

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selected && info && SelectedIcon && (
              <>
                <DialogHeader>
                  {/* Trading card style framed portrait */}
                  <div className="mx-auto mb-3 w-full max-w-[280px]">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-muted/40 to-background border-2 border-primary/40 shadow-[0_15px_45px_-10px_hsl(var(--primary)/0.45)] p-2">
                      <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-primary/20">
                        <img
                          src={TYPE_IMAGES[selected]}
                          alt={`${selected} illustration`}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 border border-primary/30">
                      <SelectedIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl">{selected}</DialogTitle>
                      <p className="text-base italic text-primary/80">"{info.philosophy}"</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-5 text-base">
                  <p className="text-foreground/90">{info.tagline}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {info.coreTraits.map((trait) => (
                      <span key={trait} className="px-2 py-0.5 rounded-full bg-muted text-sm text-muted-foreground">
                        {trait}
                      </span>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Summary</h4>
                    <p className="text-foreground/80">{info.summary}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-success/20 bg-success/5">
                      <h4 className="text-sm uppercase tracking-wider text-success mb-1">Strength</h4>
                      <p className="text-foreground/80 text-sm">{info.strengthLong}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                      <h4 className="text-sm uppercase tracking-wider text-warning mb-1">Weakness</h4>
                      <p className="text-foreground/80 text-sm">{info.weaknessLong}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Core Identity</h4>
                    <p className="text-foreground/80">{info.fullProfile.coreIdentity}</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Collecting Mindset</h4>
                    <p className="text-foreground/80">{info.fullProfile.collectingMindset}</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Inner World</h4>
                    <p className="text-foreground/80">{info.fullProfile.innerWorld}</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1.5">Blind Spots</h4>
                    <p className="text-foreground/80">{info.fullProfile.blindSpots}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <h4 className="text-sm uppercase tracking-wider text-primary mb-1.5">Growth Path</h4>
                    <p className="text-foreground/80">{info.fullProfile.growthPath}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Famous Behavior</h4>
                      <p className="text-foreground/80 text-sm italic">{info.famousBehavior}</p>
                    </div>
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Recommended Action</h4>
                      <p className="text-foreground/80 text-sm">{info.recommendedAction}</p>
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