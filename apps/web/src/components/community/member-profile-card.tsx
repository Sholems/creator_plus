import Link from 'next/link';
import type { Route } from 'next';
import { MemberAvatar } from './member-avatar';

export function MemberProfileCard({ member }: { member: any }) {
  const profile = member.communityProfile;
  return (
    <Link
      href={`/community/member/${member.id}` as Route}
      className="group flex gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm hover:border-forest-200"
    >
      <MemberAvatar name={member.displayName} src={member.avatar} size={48} />
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-ink-900 group-hover:text-forest-800">
          {member.displayName || 'Member'}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm text-ink-600">
          {profile?.headline || 'Building and learning with CreatorPlus.'}
        </p>
        <p className="mt-2 text-xs text-ink-400">
          {member._count?.communityPosts || 0} posts · {member._count?.communityFollowers || 0}{' '}
          followers
        </p>
      </div>
    </Link>
  );
}
