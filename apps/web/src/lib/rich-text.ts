const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'B',
  'I',
  'U',
  'STRONG',
  'EM',
  'H2',
  'H3',
  'H4',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'A',
  'SPAN',
  'DIV',
  'HR',
  'IMG',
]);

// IFRAME is intentionally NOT allowed: a creator-controlled iframe on a public
// product/store page is a phishing/clickjacking vector. Only inline formatting,
// links and images survive.
const ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'style', 'src', 'alt', 'width', 'height']);

// Formatting styles the editor (document.execCommand) emits — bold, italic,
// underline, alignment, colour. Kept so rich formatting survives sanitization;
// everything else (positioning, url(), expressions, …) is dropped.
const SAFE_STYLE_PROPS = new Set([
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-line',
  'text-align',
  'color',
  'background-color',
]);

function sanitizeStyleValue(raw: string): string {
  return raw
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx < 0) return '';
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (!SAFE_STYLE_PROPS.has(prop)) return '';
      // Reject anything that could smuggle a URL, script, or expression.
      if (/url\(|expression|javascript:|[<>]/i.test(value)) return '';
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Deterministic, DOM-free conversion of stored HTML to plain text. Used as the
 * server-render / first-paint fallback for rich content: it produces the exact
 * same string in Node and the browser (so it never triggers a hydration
 * mismatch) and it is XSS-safe because the result is rendered as a React text
 * child, never as raw HTML. Rich formatting is upgraded on the client after
 * mount via sanitizeRichText.
 */
export function stripToText(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3?9;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').trim();
}

export function sanitizeRichText(html: string): string {
  // No DOM available (server render): NEVER return the raw HTML — that would
  // emit unsanitized, attacker-controlled markup into the server response.
  // Fall back to safe plain text; the client upgrades to sanitized rich HTML
  // after mount (see the RichText component).
  if (typeof document === 'undefined') return stripToText(html);

  const el = document.createElement('div');
  el.innerHTML = html;

  el.querySelectorAll('script,style,object,embed,link,meta,form,input,button').forEach((node) => node.remove());

  const elements: Element[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) elements.push(walker.currentNode as Element);

  for (const node of elements) {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();

      // Drop event handlers and unsafe URLs outright.
      const isUnsafeUrl = ['href', 'src', 'xlink:href'].includes(name) &&
        /^(javascript|vbscript|data):/i.test((attr.value || '').trim());
      if (name.startsWith('on') || isUnsafeUrl) {
        node.removeAttribute(attr.name);
        continue;
      }

      // Keep a filtered `style` so inline formatting (bold, italic, colour,
      // alignment) survives; strip it entirely if nothing safe remains.
      if (name === 'style') {
        const clean = sanitizeStyleValue(attr.value || '');
        if (clean) node.setAttribute('style', clean);
        else node.removeAttribute('style');
        continue;
      }

      if (!ALLOWED_ATTRS.has(name)) {
        node.removeAttribute(attr.name);
      }
    }

    if (!ALLOWED_TAGS.has(node.tagName.toUpperCase())) {
      node.replaceWith(...Array.from(node.childNodes));
    }
  }

  el.querySelectorAll('a[href]').forEach((node) => {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  });

  return el.innerHTML;
}
