import { PersonalityType } from '@/lib/personalityEngine';

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

export const TYPE_IMAGES: Record<PersonalityType, string> = {
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

export const TYPE_TRAINERS: Record<PersonalityType, string> = {
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

export function personalityTypeFromSlug(slug: string): PersonalityType | null {
  if (!slug) return null;
  const normalized = slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
  const all: PersonalityType[] = [
    'Investor','Archivist','Dreamer','Flipper','Analyst','Hunter',
    'Explorer','Curator','Monk','Gambler','Showman','Minimalist',
  ];
  return (all as string[]).includes(normalized) ? (normalized as PersonalityType) : null;
}