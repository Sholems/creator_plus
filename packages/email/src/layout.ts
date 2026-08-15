import { BRAND, LOGO_URL, SITE_NAME, SITE_DOMAIN, SITE_URL } from './brand';

export interface LayoutOptions {
  /** Hidden preheader text shown in the inbox preview line. */
  preview?: string;
  /** Small gold eyebrow line above the main title. */
  eyebrow?: string;
  title: string;
  /** Rendered body content (already-safe HTML). */
  body: string;
  /** Primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Marks the message as marketing so the footer shows an unsubscribe note. */
  marketing?: boolean;
}

const C = BRAND;

function buttonHtml(cta: { label: string; url: string }): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 8px;">',
    '<tr>',
    '  <td align="center" bgcolor="' + C.forest800 + '" style="border-radius: 999px;">',
    '    <a href="' + cta.url + '" target="_blank" style="display: inline-block; padding: 13px 30px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 999px;">' + cta.label + '</a>',
    '  </td>',
    '</tr>',
    '</table>',
  ].join('\n');
}

/**
 * Branded HTML email shell for CreatorPlus: deep-forest header with the
 * official logo, savanna-gold accents on palm-cream. Table-based with inline
 * styles so it renders consistently across Gmail, Outlook and mobile clients.
 */
export function renderEmailLayout(opts: LayoutOptions): string {
  const preview = opts.preview || opts.title;
  const footerNote = opts.marketing
    ? 'You are receiving this because you are a member of ' + SITE_NAME + '.'
    : 'You received this email because you have an account on ' + SITE_NAME + '.';

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta http-equiv="X-UA-Compatible" content="IE=edge">',
    '<title>' + preview + '</title>',
    '<style>',
    '  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }',
    '  body { margin: 0; padding: 0; width: 100% !important; }',
    '  .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }',
    '  a { color: ' + C.forest600 + '; }',
    '  h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; color: ' + C.ink900 + '; }',
    '  p { font-family: Arial, Helvetica, sans-serif; }',
    '  .muted { color: ' + C.ink500 + '; }',
    '  .stars { color: ' + C.gold500 + '; font-size: 22px; }',
    '  blockquote { border-left: 4px solid ' + C.gold500 + '; padding-left: 16px; margin: 20px 0; color: ' + C.ink600 + '; }',
    '  table.products { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, Helvetica, sans-serif; }',
    '  table.products th, table.products td { padding: 12px; text-align: left; border-bottom: 1px solid ' + C.ink100 + '; font-size: 14px; color: ' + C.ink900 + '; }',
    '  table.products th { background: ' + C.cream100 + '; color: ' + C.forest800 + '; }',
    '  table.products tr.total td { border-top: 2px solid ' + C.forest800 + '; border-bottom: none; font-weight: 700; }',
    '@media only screen and (max-width: 620px) { .container { width: 100% !important; } }',
    '</style>',
    '</head>',
    '<body style="margin: 0; padding: 0; background-color: ' + C.cream50 + ';">',
    '<div class="preheader">' + preview + '</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ' + C.cream50 + ';">',
    '<tr><td style="padding: 24px 12px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" align="center" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(5, 33, 25, 0.08);">',
    // Header
    '<tr>',
    '<td align="center" bgcolor="' + C.forest950 + '" style="background-image: linear-gradient(160deg, ' + C.forest950 + ' 0%, ' + C.forest800 + ' 100%); padding: 32px 24px 28px;">',
    '<img src="' + LOGO_URL + '" width="52" height="52" alt="' + SITE_NAME + '" style="display: block; width: 52px; height: 52px; margin: 0 auto;">',
    '<p style="margin: 12px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: #ffffff;">Creator<span style="color: ' + C.gold500 + ';">Plus</span></p>',
    (opts.eyebrow
      ? '<p style="margin: 10px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ' + C.gold300 + ';">' + opts.eyebrow + '</p>'
      : ''),
    '<h1 style="margin: 8px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; line-height: 1.3; font-weight: 700; color: #ffffff;">' + opts.title + '</h1>',
    '</td>',
    '</tr>',
    // Content
    '<tr>',
    '<td style="padding: 32px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: ' + C.ink600 + ';">',
    opts.body,
    opts.cta ? buttonHtml(opts.cta) : '',
    '</td>',
    '</tr>',
    // Footer
    '<tr>',
    '<td style="padding: 24px 28px 28px; background-color: ' + C.cream50 + '; border-top: 1px solid ' + C.ink100 + '; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: ' + C.ink400 + ';">',
    '<p style="margin: 0 0 6px;">&copy; ' + new Date().getFullYear() + ' ' + SITE_NAME + ' &middot; ' + SITE_DOMAIN + '</p>',
    '<p style="margin: 0;">' + footerNote + '</p>',
    opts.marketing
      ? '<p style="margin: 8px 0 0;"><a href="' + SITE_URL + '" style="color: ' + C.forest600 + ';">Visit the marketplace</a></p>'
      : '',
    '</td>',
    '</tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
}
