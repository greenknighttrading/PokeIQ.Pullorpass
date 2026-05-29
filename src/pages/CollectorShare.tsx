import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PERSONALITY_INFO, PersonalityType } from '@/lib/personalityEngine';
import { TYPE_IMAGES, TYPE_TRAINERS, personalityTypeFromSlug } from '@/lib/personalityAssets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Seo } from '@/components/seo/Seo';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';

export default function CollectorShare() {
  const { slug } = useParams<{ slug: string }>();
  const type: PersonalityType | null = personalityTypeFromSlug(slug ?? '');

  if (!type) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Collector type not found</h1>
        <Link to="/personality-types">
          <Button>Browse all collector types</Button>
        </Link>
      </div>
    );
  }

  const info = PERSONALITY_INFO[type];

  return (
    <>
      <Seo
        title={`I'm The ${type} | PokeIQ Collector Type`}
        description={`${info.tagline} Take the PokeIQ Collector Personality Test and find your type.`}
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-5 p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30"
          >
            <p className="text-sm uppercase tracking-wider text-primary font-medium">
              PokeIQ Collector Personality
            </p>
            <h1 className="text-4xl font-bold text-foreground">
              {info.emoji} The {type}
            </h1>
            <p className="text-lg text-primary italic">"{info.philosophy}"</p>

            <div className="mx-auto w-full max-w-[280px] pt-2">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-muted/40 to-background border-2 border-primary/40 shadow-[0_15px_45px_-10px_hsl(var(--primary)/0.45)] p-2">
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-primary/20">
                  <img
                    src={TYPE_IMAGES[type]}
                    alt={`${type} collector personality illustration`}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wider text-primary/80 font-medium">
                  Associated Trainer
                </p>
                <p className="text-xl font-bold text-foreground">{TYPE_TRAINERS[type]}</p>
              </div>
            </div>

            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-base pt-2">
              {info.tagline}
            </p>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {info.coreTraits.map((t, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-background/60 border border-primary/30 text-xs text-foreground/90">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <Card className="p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Core Identity</h2>
            <p className="text-sm text-foreground/85 leading-relaxed">{info.fullProfile.coreIdentity}</p>
          </Card>

          <div className="text-center space-y-3 pt-2">
            <p className="text-muted-foreground">Want to know your own collector type?</p>
            <Link to="/test">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Take the Test
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <div className="pt-4">
              <Link to="/swipe">
                <Button variant="outline" className="gap-2">
                  Play Pull or Swipe
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}