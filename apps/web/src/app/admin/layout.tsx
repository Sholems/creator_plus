'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@creatorplus/ui';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const NAV_SECTIONS: { heading: string; links: { href: string; label: string; icon: string }[] }[] = [
  {
    heading: 'Overview',
    links: [{ href: '/admin', label: 'Dashboard', icon: '📊' }],
  },
  {
    heading: 'Operations',
    links: [
      { href: '/admin/orders', label: 'Orders', icon: '🧾' },
      { href: '/admin/payouts', label: 'Payouts', icon: '💸' },
      { href: '/admin/refunds', label: 'Refunds', icon: '↩️' },
    ],
  },
  {
    heading: 'Moderation',
    links: [
      { href: '/admin/products', label: 'Products', icon: '📦' },
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/creators', label: 'Creators', icon: '🎓' },
      { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { href: '/admin/support', label: 'Tickets', icon: '🎧' },
      { href: '/admin/contacts', label: 'Contact Inbox', icon: '✉️' },
      { href: '/admin/broadcasts', label: 'Broadcasts', icon: '📢' },
    ],
  },
  {
    heading: 'Configuration',
    links: [
      { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
      { href: '/admin/settings/payments', label: 'Payments', icon: '💳' },
      { href: '/admin/settings/tracking', label: 'Tracking', icon: '📈' },
      { href: '/admin/settings/roles', label: 'Roles', icon: '🔑' },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: '🚩' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isLoading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, token, pathname, router]);

  // Show nothing while loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-200 border-t-forest-800" />
      </div>
    );
  }

  // Not logged in — redirect handled by effect
  if (!token) return null;

  // Not an admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-cream-50">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-6xl">🔒</p>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Access Denied</h1>
            <p className="mt-2 text-ink-500">You don&apos;t have permission to access the admin dashboard.</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700"
            >
              Go Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Mobile sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-forest-800 text-cream-50 shadow-lg md:hidden"
              aria-label="Toggle admin menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <aside
              className={cn(
                'w-full shrink-0 md:w-72',
                'fixed inset-y-0 left-0 z-30 transform bg-white transition-transform duration-200 md:static md:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              <div className="sticky top-24 overflow-y-auto p-4 md:p-0">
                <div className="rounded-2xl border border-ink-100 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 px-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-800 text-xs font-bold text-cream-50">
                      A
                    </span>
                    <h2 className="font-display text-lg font-semibold text-ink-900">Admin Panel</h2>
                  </div>

                  <nav className="space-y-5">
                    {NAV_SECTIONS.map((section) => (
                      <div key={section.heading}>
                        <p className="mb-1.5 px-3 text-[0.625rem] font-semibold uppercase tracking-widest text-ink-400">
                          {section.heading}
                        </p>
                        <ul className="space-y-0.5">
                          {section.links.map((link) => {
                            const active =
                              link.href === '/admin'
                                ? pathname === '/admin'
                                : pathname.startsWith(link.href);
                            return (
                              <li key={link.href}>
                                <Link
                                  href={link.href as any}
                                  onClick={() => setSidebarOpen(false)}
                                  className={cn(
                                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                                    active
                                      ? 'bg-forest-800 text-cream-50'
                                      : 'text-ink-600 hover:bg-cream-100 hover:text-ink-900',
                                  )}
                                >
                                  <span className="text-base leading-none">{link.icon}</span>
                                  {link.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
