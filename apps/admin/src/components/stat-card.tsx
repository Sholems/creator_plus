import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@creatorplus/ui';

const TONES: Record<string, string> = {
  gold: 'bg-gold-50 text-gold-600',
  forest: 'bg-forest-50 text-forest-600',
  clay: 'bg-clay-50 text-clay-600',
  cream: 'bg-cream-100 text-ink-600',
};

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: ReactNode;
  tone?: 'gold' | 'forest' | 'clay' | 'cream';
  href?: string;
  accent?: boolean;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  tone = 'gold',
  href,
  accent = false,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        'surface-card group relative flex items-start gap-4 p-5 transition-all',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink-900/5',
        accent && 'ring-1 ring-clay-500/40',
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-ink-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold leading-none text-ink-900">{value}</p>
        {sublabel && <p className="mt-1.5 truncate text-xs text-ink-500">{sublabel}</p>}
      </div>
      {href && (
        <span className="mt-1 text-ink-300 transition-colors group-hover:text-gold-600" aria-hidden>
          →
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href as any} className="block">{content}</Link>;
  }
  return content;
}
