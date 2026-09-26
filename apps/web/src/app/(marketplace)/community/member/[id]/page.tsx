'use client';
import { use, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MemberAvatar } from '@/components/community/member-avatar';
import { CommunityPageState } from '@/components/community/community-page-state';

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { token } = useAuth(); const [member, setMember] = useState<any>(); const [error, setError] = useState('');
  useEffect(() => { if (token) api.getCommunityMember(token, id).then(setMember).catch((e) => setError(e.message)); }, [token, id]);
  if (error) return <main className="p-8"><CommunityPageState title="Profile unavailable" message={error}/></main>;
  if (!member) return <main className="p-8"><CommunityPageState title="Loading profile" message="Fetching this member’s Growth Club profile…"/></main>;
  const profile = member.communityProfile;
  return <main className="min-h-screen bg-cream-50 px-4 py-8"><article className="mx-auto max-w-3xl rounded-[2rem] border border-ink-100 bg-white p-7 shadow-sm">
    <div className="flex flex-wrap items-start gap-5"><MemberAvatar name={member.displayName} src={member.avatar} size={72}/><div className="min-w-0 flex-1"><h1 className="font-display text-3xl font-bold text-ink-900">{member.displayName || 'Member'}</h1><p className="mt-1 text-ink-600">{profile?.headline}</p></div>{!member.isSelf && <button onClick={async () => setMember({ ...member, ...(await api.toggleCommunityFollow(token!, id)) })} className="rounded-full bg-forest-800 px-5 py-2 text-sm font-semibold text-white">{member.following ? 'Following' : 'Follow'}</button>}</div>
    {profile?.bio && <p className="mt-7 whitespace-pre-wrap text-sm leading-7 text-ink-700">{profile.bio}</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><div><strong className="block text-xl text-ink-900">{profile?.points || 0}</strong><span className="text-xs text-ink-500">points</span></div><div><strong className="block text-xl text-ink-900">{member._count.communityPosts}</strong><span className="text-xs text-ink-500">posts</span></div><div><strong className="block text-xl text-ink-900">{member._count.communityFollowers}</strong><span className="text-xs text-ink-500">followers</span></div></div>
    {profile?.expertise?.length > 0 && <div className="mt-7 flex flex-wrap gap-2">{profile.expertise.map((x: string) => <span key={x} className="rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-800">{x}</span>)}</div>}
  </article></main>;
}
