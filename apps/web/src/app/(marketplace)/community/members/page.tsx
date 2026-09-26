'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MemberProfileCard } from '@/components/community/member-profile-card';
import { CommunityPageState } from '@/components/community/community-page-state';

export default function MembersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load(query = search) {
    if (!token) return;
    setLoading(true); setError('');
    try { setMembers((await api.getCommunityMembers(token, { search: query })).items); }
    catch (e: any) { setError(e.message || 'Could not load members'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(''); }, [token]);
  return <main className="min-h-screen bg-cream-50 px-4 py-8"><div className="mx-auto max-w-5xl">
    <p className="eyebrow text-gold-600">People to learn with</p><h1 className="font-display text-4xl font-bold text-ink-900">Member directory</h1>
    <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(); }}><input aria-label="Search members" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-full border border-ink-200 bg-white px-5 py-3 text-sm" placeholder="Search by name or expertise"/><button className="rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-white">Search</button></form>
    {loading ? <CommunityPageState title="Finding members" message="Loading the Growth Club directory…" /> : error ? <CommunityPageState title="Directory unavailable" message={error} /> : members.length === 0 ? <CommunityPageState title="No members found" message="Try a broader search or return after more members publish their profiles." /> : <div className="mt-6 grid gap-4 md:grid-cols-2">{members.map((m) => <MemberProfileCard key={m.id} member={m}/>)}</div>}
  </div></main>;
}
