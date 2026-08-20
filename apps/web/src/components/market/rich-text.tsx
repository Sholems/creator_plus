'use client';

import { useEffect, useState } from 'react';
import { sanitizeRichText, stripToText } from '@/lib/rich-text';

/**
 * Renders stored rich-text (e.g. a product description) safely.
 *
 * Server render and the first client paint show plain text (via the
 * deterministic, DOM-free stripToText) — identical in both environments, so
 * there is no hydration mismatch, and it can never inject markup. After mount
 * the content is replaced with browser-sanitized rich HTML. This closes the
 * SSR XSS hole where a browser-only sanitizer would otherwise let raw HTML
 * reach the server-rendered response.
 */
export function RichText({
  html,
  className,
}: {
  html: string | null | undefined;
  className?: string;
}) {
  const source = html || '';
  const [clean, setClean] = useState<string | null>(null);

  useEffect(() => {
    setClean(sanitizeRichText(source));
  }, [source]);

  if (clean === null) {
    return <div className={className}>{stripToText(source)}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
