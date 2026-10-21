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
    <nav aria-label="Account navigation">
      <div className="mb-5 border-b border-ink-100 pb-4">
        <h2 className="font-display text-base font-semibold text-ink-900">My Account</h2>
        {user && <p className="mt-0.5 truncate text-xs text-ink-500">{user.displayName || user.email}</p>}
      </div>
      <ul className="space-y-0.5">
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
                  'block border-l-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500',
                  active
                    ? 'border-forest-700 bg-forest-50 text-forest-900'
                    : 'border-transparent text-ink-600 hover:border-ink-200 hover:text-ink-900',
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
        className="mt-5 block border-t border-ink-100 px-3 pt-4 text-sm font-semibold text-forest-700 hover:text-forest-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
      >
        ← Back to Community
      </Link>
    </nav>
  );
}
