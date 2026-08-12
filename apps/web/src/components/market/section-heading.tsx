import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@creatormarket/ui';

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: Route; label: string };
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn(align === 'center' && 'flex flex-col items-center')}>
        {eyebrow && <p className="eyebrow text-gold-600">{eyebrow}</p>}
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-base text-ink-500">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-600"
        >
          {action.label}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}
