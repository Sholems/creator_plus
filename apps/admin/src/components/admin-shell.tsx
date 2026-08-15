'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { CreatorPlusMark } from '@/components/brand/logo';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/users', label: 'Users' },
  { href: '/roles', label: 'Roles' },
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/affiliates', label: 'Affiliates' },
  { href: '/payouts', label: 'Payouts' },
  { href: '/broadcasts', label: 'Broadcasts' },
  { href: '/contact', label: 'Contact' },
  { href: '/support-tickets', label: 'Support Tickets' },
  { href: '/settings', label: 'Settings' },
];

function Diamond({ className }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rotate-45 rounded-[1px] ${className ?? ''}`} />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // The login page renders standalone (no chrome, no guard).
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-950 text-forest-300">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-forest-950 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
          <CreatorPlusMark className="h-9 w-9 text-white" />
          <div>
            <p className="font-display text-base font-bold leading-none">
              <span className="text-white">Creator</span>
              <span className="text-gold-400">Plus</span>
            </p>
            <p className="eyebrow mt-1 text-gold-400">Admin console</p>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 px-3">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/10 text-gold-300'
                    : 'text-forest-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Diamond className={active ? 'bg-gold-400' : 'bg-forest-500'} />
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4">
          <p className="eyebrow text-forest-400">CreatorPlus marketplace</p>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-cream-50 px-8">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.6-6.2 4.6 2.4-7.6L2 9.6h7.6z" />
            </svg>
            <span className="eyebrow text-ink-600">Super Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-600">{user?.email}</span>
            <button
              onClick={logout}
              className="btn btn-ghost btn-md"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
