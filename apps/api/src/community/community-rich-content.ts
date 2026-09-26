import sanitizeHtml from 'sanitize-html';
import { BadRequestException } from '@nestjs/common';
import { assertOwnStorageUrl } from '../qr-studio/qr-content-validation';

const EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'iframe.mediadelivery.net',
  'player.mediadelivery.net',
  'loom.com',
]);

function safeUrl(value: string, kind: 'link' | 'image' | 'iframe'): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (kind === 'image') return assertOwnStorageUrl(url.toString());
    if (kind === 'iframe' && !EMBED_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeCommunityHtml(input: string): string {
  const clean = sanitizeHtml(input || '', {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'hr',
      'a',
      'img',
      'iframe',
    ],
    allowedAttributes: {
      a: ['href'],
      img: ['src', 'alt', 'title'],
      iframe: ['src', 'title', 'allow', 'allowfullscreen'],
    },
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: 'a',
        attribs: {
          href: safeUrl(attrs.href || '', 'link') || '#',
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
      img: (_tag, attrs) => {
        const src = safeUrl(attrs.src || '', 'image');
        return src
          ? { tagName: 'img', attribs: { src, alt: String(attrs.alt || '').slice(0, 200) } }
          : { tagName: 'span', attribs: {} as Record<string, string> };
      },
      iframe: (_tag, attrs) => {
        const src = safeUrl(attrs.src || '', 'iframe');
        return src
          ? {
              tagName: 'iframe',
              attribs: {
                src,
                title: String(attrs.title || 'Embedded media').slice(0, 200),
                allow: 'fullscreen; picture-in-picture',
                allowfullscreen: 'true',
              },
            }
          : { tagName: 'span', attribs: {} as Record<string, string> };
      },
    },
    allowedSchemes: ['http', 'https'],
  }).trim();
  if (!clean || !sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim()) {
    throw new BadRequestException('Rich content must contain readable text');
  }
  return clean;
}
