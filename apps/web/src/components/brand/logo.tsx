import { cn } from '@creatormarket/ui';

/**
 * CreatorPlus brand mark — the official CP+ app icon (green rounded square,
 * white C, gold P with a plus). Self-contained raster asset in /public.
 */
export function CreatorPlusMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-icon.png"
      alt="CreatorPlus"
      className={cn('object-contain', className)}
    />
  );
}

/** "CreatorPlus" wordmark — forest "Creator" + gold "Plus". */
export function CreatorPlusWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-tight', className)}>
      <span className="text-forest-800">Creator</span>
      <span className="text-gold-500">Plus</span>
    </span>
  );
}

/**
 * Full horizontal logo: mark + wordmark. `variant="light"` renders the
 * wordmark in light colors for dark backgrounds (e.g. the header).
 */
export function CreatorPlusLogo({
  className,
  markClassName,
  variant = 'default',
}: {
  className?: string;
  markClassName?: string;
  variant?: 'default' | 'light';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <CreatorPlusMark className={cn('h-8 w-8', variant === 'light' && 'text-white', markClassName)} />
      <span className="font-display text-2xl font-bold tracking-tight">
        <span className={variant === 'light' ? 'text-white' : 'text-forest-800'}>Creator</span>
        <span className="text-gold-500">Plus</span>
      </span>
    </span>
  );
}
