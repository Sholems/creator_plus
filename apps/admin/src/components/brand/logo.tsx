function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * CreatorPlus brand mark — the official CP+ app icon (green rounded square,
 * white C, gold P with a plus). Self-contained raster asset in /public.
 */
export function CreatorPlusMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-icon.png" alt="CreatorPlus" className={cx('object-contain', className)} />
  );
}
