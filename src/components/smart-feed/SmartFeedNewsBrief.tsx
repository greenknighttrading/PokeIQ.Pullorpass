import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ArrowRight } from 'lucide-react';
import { generateSmartBrief, saveBriefToSession, type BriefInputs } from '@/lib/smartBrief';

interface Props {
  inputs: BriefInputs;
}

export default function SmartFeedNewsBrief({ inputs }: Props) {
  const navigate = useNavigate();
  const brief = useMemo(() => generateSmartBrief(inputs), [inputs]);

  const teaser = brief.snapshot.slice(0, 2).join(' ');
  const dateLabel = new Date(brief.generatedAt).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const open = () => {
    saveBriefToSession(brief);
    navigate('/smart-feed/brief');
  };

  return (
    <button
      onClick={open}
      className="w-full text-left glass-card rounded-xl p-5 sm:p-6 border-2 border-border hover:border-primary/40 transition-all group block"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Smart Feed News Brief
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{dateLabel}</span>
      </div>

      <h2 className="text-xl sm:text-2xl font-black leading-tight mb-2 group-hover:text-primary transition-colors">
        Daily Pokémon Market Intelligence
      </h2>
      <p className="text-sm sm:text-base text-foreground/85 leading-relaxed line-clamp-3">
        {teaser}
      </p>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
        Read the full brief
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}