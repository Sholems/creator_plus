'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  CalendarIcon,
  ChallengeIcon,
  DiscussIcon,
  HomeIcon,
  LearnIcon,
  MembersIcon,
} from './community-icons';

const links = [
  { href: '/community', label: 'Home', icon: HomeIcon },
  { href: '/community/courses', label: 'Learn', icon: LearnIcon },
  { href: '/community/discussion', label: 'Discuss', icon: DiscussIcon },
  { href: '/community/members', label: 'Members', icon: MembersIcon },
  { href: '/community/events', label: 'Events', icon: CalendarIcon },
  { href: '/community/challenges', label: 'Challenges', icon: ChallengeIcon },
] as const;

export function CommunityNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Growth Club" className="community-nav">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === '/community' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as Route}
            aria-current={active ? 'page' : undefined}
            className={active ? 'is-active' : ''}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
