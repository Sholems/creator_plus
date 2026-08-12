import Link from 'next/link';
import type { Route } from 'next';
import { CreatorPlusMark } from '@/components/brand/logo';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

const COLUMNS: { heading: string; links: { href: Route; label: string }[] }[] = [
  {
    heading: 'The Market',
    links: [
      { href: '/marketplace', label: 'Browse products' },
      { href: '/categories', label: 'Categories' },
      { href: '/creators', label: 'Creators' },
      { href: '/creator-center', label: 'Creator Center' },
      { href: '/guides', label: 'Creator Guides' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { href: '/sell', label: 'Start selling' },
      { href: '/earn', label: 'Earn as an affiliate' },
      { href: '/community', label: 'Community' },
      { href: '/help', label: 'Help Center' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/press', label: 'Press' },
      { href: '/partnerships', label: 'Partnerships' },
      { href: '/careers', label: 'Careers' },
      { href: '/api', label: 'API' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/licensing', label: 'Licensing' },
      { href: '/dmca', label: 'DMCA' },
      { href: '/contact', label: 'Contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-100">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-6">
          {/* Brand block */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <CreatorPlusMark className="h-9 w-9 shrink-0" />
              <span className="font-display text-2xl font-bold leading-none tracking-tight">
                <span className="text-white">Creator</span>
                <span className="text-gold-400">Plus</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream-100/70">
              {SITE_TAGLINE}. Built in Nigeria for Nigerian and African makers —
              buy and sell digital work, get paid in naira, and keep 90% of every
              sale.
            </p>
            <div className="mt-6">
              <p className="eyebrow text-cream-100/50">We accept</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {['Paystack', 'Flutterwave', 'Stripe', 'Visa', 'Mastercard', 'Verve'].map((p) => (
                  <span
                    key={p}
                    className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-medium text-cream-100/80"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="eyebrow text-gold-300">{col.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-cream-100/70 transition-colors hover:text-gold-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-cream-100/50">
              &copy; {new Date().getFullYear()} {SITE_NAME}. Made with love in
              Lagos — for Africa, then the world.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-cream-100/60 hover:text-gold-300" aria-label="X / Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-cream-100/60 hover:text-gold-300" aria-label="Instagram">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" className="text-cream-100/60 hover:text-gold-300" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
