'use client';

import { useAuth } from '@/lib/auth';
import { CommunityNavigation } from './community-navigation';

export function CommunityShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading || !isAuthenticated) return <>{children}</>;
  return (
    <div className="community-workspace">
      <aside className="community-rail">
        <div className="community-rail-brand">
          <span>Bold Ideas</span>
          <strong>Growth Club</strong>
        </div>
        <CommunityNavigation />
        <div className="community-member-chip">
          <span>{(user?.displayName || 'M').slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user?.displayName || 'Member'}</strong>
            <small>CreatorPlus member</small>
          </div>
        </div>
      </aside>
      <div className="community-stage">{children}</div>
      <div className="community-mobile-nav">
        <CommunityNavigation />
      </div>
    </div>
  );
}
