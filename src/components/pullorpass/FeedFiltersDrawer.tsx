import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardFormat = 'singles' | 'sealed';
export type Language = 'english' | 'japanese';
export type EraKey =
  | 'wotc' | 'ex' | 'dp' | 'bw' | 'xy' | 'sm' | 'swsh' | 'sv';

export interface FeedFilters {
  priceMin: number;
  priceMax: number;
  eras: EraKey[];
  formats: CardFormat[];
  languages: Language[];
}

export const DEFAULT_FILTERS: FeedFilters = {
  priceMin: 0.01,
  priceMax: 1000,
  eras: [],
  formats: [],
  languages: [],
};

export const PRICE_FLOOR = 0.01;
export const PRICE_CEIL = 5000;

const ERA_OPTIONS: { key: EraKey; label: string }[] = [
  { key: 'wotc', label: 'WOTC' },
  { key: 'ex', label: 'EX Era' },
  { key: 'dp', label: 'Diamond & Pearl' },
  { key: 'bw', label: 'Black & White' },
  { key: 'xy', label: 'XY' },
  { key: 'sm', label: 'Sun & Moon' },
  { key: 'swsh', label: 'Sword & Shield' },
  { key: 'sv', label: 'Scarlet & Violet' },
];

const FORMAT_OPTIONS: { key: CardFormat; label: string }[] = [
  { key: 'singles', label: 'Singles' },
  { key: 'sealed', label: 'Sealed' },
];

const LANGUAGE_OPTIONS: { key: Language; label: string }[] = [
  { key: 'english', label: 'English' },
  { key: 'japanese', label: 'Japanese' },
];

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full border text-sm font-medium transition-all select-none active:scale-95',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]'
          : 'bg-card/60 text-foreground/85 border-border hover:border-primary/40 hover:bg-primary/5',
      )}
    >
      {children}
    </button>
  );
}

export function FeedFiltersDrawer({
  open,
  onOpenChange,
  initial,
  remainingCount,
  onApply,
  onReset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: FeedFilters;
  remainingCount: number;
  onApply: (f: FeedFilters) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = React.useState<FeedFilters>(initial);

  React.useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const toggle = <K extends keyof FeedFilters>(key: K, value: any) => {
    setDraft((d) => {
      const arr = d[key] as any[];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      return { ...d, [key]: next } as FeedFilters;
    });
  };

  const reset = () => {
    setDraft(DEFAULT_FILTERS);
    onReset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[70vh] max-h-[70vh] flex flex-col bg-background border-primary/20">
        <DrawerHeader className="text-left px-5 pt-2 pb-3 shrink-0">
          <DrawerTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Train Your Feed
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            Adjust what appears in the rest of this swipe session.
          </DrawerDescription>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mt-1">
            Current card will remain unchanged
          </p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">
          {/* Price */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">
                Price Range
              </h3>
              <span className="text-sm font-bold text-primary tabular-nums">
                ${draft.priceMin} — ${draft.priceMax >= PRICE_CEIL ? `${PRICE_CEIL}+` : draft.priceMax}
              </span>
            </div>
            <Slider
              min={PRICE_FLOOR}
              max={PRICE_CEIL}
              step={1}
              value={[draft.priceMin, draft.priceMax]}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, priceMin: v[0], priceMax: v[1] }))
              }
              className="py-2"
            />
            <div className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Min ${PRICE_FLOOR}</span>
              <span>Max ${PRICE_CEIL}+</span>
            </div>
          </section>

          {/* Era */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">Era</h3>
            <div className="flex flex-wrap gap-2">
              {ERA_OPTIONS.map((e) => (
                <Chip key={e.key} active={draft.eras.includes(e.key)} onClick={() => toggle('eras', e.key)}>
                  {e.label}
                </Chip>
              ))}
            </div>
          </section>

          {/* Format */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">Show Me</h3>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <Chip key={f.key} active={draft.formats.includes(f.key)} onClick={() => toggle('formats', f.key)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">Language</h3>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <Chip key={l.key} active={draft.languages.includes(l.key)} onClick={() => toggle('languages', l.key)}>
                  {l.label}
                </Chip>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur px-5 pt-3 pb-5 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">
            Cards Remaining: <span className="text-foreground font-semibold tabular-nums">{remainingCount}</span>
          </p>
          <Button
            className="w-full h-12 text-base font-bold shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
            onClick={() => onApply(draft)}
          >
            Apply To Remaining Cards
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Era matcher — handles real DB set_names which include prefixes like
// "SV: Prismatic Evolutions", "SWSH08: Fusion Strike", "SM - Cosmic Eclipse".
const ERA_PATTERNS: Record<EraKey, RegExp> = {
  wotc: /\b(base set|jungle|fossil|team rocket|gym heroes|gym challenge|neo |expedition|aquapolis|skyridge|legendary collection)/i,
  ex:   /^(ex[: ]|ex\d)|\b(ex (ruby|sandstorm|dragon|team magma|team aqua|hidden legends|firered|leafgreen|deoxys|emerald|unseen forces|delta species|legend maker|holon|crystal guardians|dragon frontiers|power keepers))/i,
  dp:   /^(dp[: \d]|hgss[: \d])|\b(diamond|pearl|platinum|mysterious treasures|secret wonders|great encounters|majestic dawn|legends awakened|stormfront|rising rivals|supreme victors|arceus|heartgold|soulsilver|unleashed|undaunted|triumphant|call of legends)/i,
  bw:   /^(bw[: \d])|\b(black ?& ?white|black and white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures)/i,
  xy:   /^(xy[: \d]|xy )|\b(flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos)/i,
  sm:   /^(sm[: \d]|sm[ -])|\b(sun ?& ?moon|sun and moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty)/i,
  swsh: /^(swsh[: \d])|\b(sword ?& ?shield|sword and shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|pokemon go|celebrations|shining fates)/i,
  sv:   /^(sv[: \d])|\b(scarlet ?& ?violet|scarlet and violet|paldea|obsidian flames|\b151\b|paradox rift|paldean fates|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic evolutions|journey together|destined rivals|black bolt|white flare)/i,
};

export function matchesEras(setName: string | null, eras: EraKey[]): boolean {
  if (eras.length === 0) return true;
  if (!setName) return false;
  return eras.some((e) => ERA_PATTERNS[e].test(setName));
}

// Resolve product_type values. Anything that isn't sealed is treated as a single.
export function formatsToProductTypes(formats: CardFormat[]): string[] {
  if (formats.length === 0) return ['card', 'sealed'];
  const out = new Set<string>();
  if (formats.includes('singles')) out.add('card');
  if (formats.includes('sealed')) out.add('sealed');
  return Array.from(out);
}