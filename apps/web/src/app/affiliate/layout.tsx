'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@creatormarket/ui';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AffiliateGate } from '@/components/affiliate/affiliate-gate';

const NAV: { href: Route; label: string }[] = [
  { href: '/affiliate/dashboard', label: 'Dashboard' },
  { href: '/affiliate/marketplace', label: 'Marketplace' },
  { href: '/affiliate/products', label: 'My Links' },
  { href: '/affiliate/analytics', label: 'Analytics' },
  { href: '/affiliate/earnings', label: 'Earnings' },
  { href: '/affiliate/settings', label: 'Settings' },
];

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <AffiliateGate>
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap gap-2 border-b border-ink-100 pb-4" aria-label="Affiliate">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-forest-800 text-cream-50'
                      : 'text-ink-600 hover:bg-cream-100',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8">{children}</div>
          </div>
        </AffiliateGate>
      </main>
      <Footer />
    </div>
  );
}
