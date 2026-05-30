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
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Summary</h2>
            <p className="text-foreground/85 leading-relaxed">{info.summary}</p>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5 bg-success/5 border-success/20 space-y-2">
              <h3 className="text-sm uppercase tracking-wider text-success">Strength</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">{info.strengthLong}</p>
            </Card>
            <Card className="p-5 bg-warning/5 border-warning/20 space-y-2">
              <h3 className="text-sm uppercase tracking-wider text-warning">Weakness</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">{info.weaknessLong}</p>
            </Card>
          </div>

          <Card className="p-6 space-y-5">
            {[
              { title: 'Core Identity', body: info.fullProfile.coreIdentity },
              { title: 'Collecting Mindset', body: info.fullProfile.collectingMindset },
              { title: 'Inner World', body: info.fullProfile.innerWorld },
              { title: 'Blind Spots', body: info.fullProfile.blindSpots },
            ].map((s) => (
              <div key={s.title}>
                <h3 className="text-xs uppercase tracking-wider text-primary font-medium mb-1.5">{s.title}</h3>
                <p className="text-sm text-foreground/85 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20 space-y-2">
            <h3 className="text-sm uppercase tracking-wider text-primary">Growth Path</h3>
            <p className="text-foreground/85 leading-relaxed">{info.fullProfile.growthPath}</p>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Collection Style</h3>
              <ul className="text-sm text-foreground/85 list-disc pl-5 space-y-1">
                {info.collectionStyle.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Signature Move</h3>
                <p className="text-sm italic text-foreground/85">"{info.famousBehavior}"</p>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Try This</h3>
                <p className="text-sm text-foreground/85">{info.recommendedAction}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <h3 className="text-xs uppercase tracking-wider text-destructive mb-1">Danger Zone</h3>
              <p className="text-sm text-foreground/85">{info.dangerZone}</p>
            </div>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-8 md:p-10 text-center space-y-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
            <div className="relative space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">
                Your turn
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                Discover your collector type
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Take the 10-minute test to uncover the psychology behind how you collect.
              </p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 justify-center items-center pt-1">
              <Link to="/test" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                  <Sparkles className="w-4 h-4" />
                  Take the Test
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/swipe" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto border-primary/30 hover:bg-primary/10">
                  Play Pull or Swipe
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}