'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/roles';

const items = [
  ['/community/manage', 'Courses'],
  ['/community/manage/events', 'Events'],
  ['/community/manage/challenges', 'Challenges'],
  ['/community/manage/moderation', 'Moderation & ops'],
] as const;

export function CommunityAdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Only platform admins appoint community managers.
  const links = isPlatformAdmin(user?.roles) ? [...items, ['/community/manage/team', 'Team'] as const] : items;
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="CreatorPlus Community management">
      {links.map(([href, label]) => {
        const active = href === '/community/manage' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as Route}
            className={
              active
                ? 'shrink-0 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50'
                : 'shrink-0 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600'
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
