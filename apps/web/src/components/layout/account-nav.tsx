'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@creatorplus/ui';
import { useAuth } from '@/lib/auth';

/**
 * Sidebar for the single member account area. Replaces the marketplace-era
 * buyer/creator dashboards; shared by /dashboard/* and /creator/qr-studio.
 */
const ACCOUNT_LINKS: { href: Route; label: string }[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/community/join' as Route, label: 'Membership & Billing' },
  { href: '/creator/qr-studio' as Route, label: 'QR Studio' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/community/settings' as Route, label: 'Community Profile' },
  { href: '/dashboard/settings', label: 'Account Settings' },
  { href: '/dashboard/settings/security' as Route, label: 'Security' },
  { href: '/dashboard/support', label: 'Help & Support' },
];

// Parents whose children have their own sidebar entry.
const EXACT_ONLY = new Set<string>(['/dashboard', '/dashboard/settings']);

export function AccountNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="rounded-2xl border border-ink-100 bg-white p-4" aria-label="Account navigation">
      <div className="mb-4 px-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">My Account</h2>
        {user && <p className="mt-0.5 truncate text-xs text-ink-500">{user.displayName || user.email}</p>}
      </div>
      <ul className="space-y-1">
        {ACCOUNT_LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (!EXACT_ONLY.has(link.href) && pathname.startsWith(`${link.href}/`));
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-forest-800 text-cream-50'
                    : 'text-ink-600 hover:bg-cream-100 hover:text-ink-900',
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/community"
        className="mt-4 block rounded-xl bg-cream-50 px-3 py-2.5 text-sm font-semibold text-forest-700 hover:text-forest-600"
      >
        ← Back to Community
      </Link>
    </nav>
  );
}
