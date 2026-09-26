'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function CommunitySettingsPage() {
  const { token, user } = useAuth(); const [profile, setProfile] = useState({ headline: '', bio: '', expertise: '', goals: '', visibility: 'MEMBERS_ONLY' }); const [prefs, setPrefs] = useState<any>(); const [note, setNote] = useState('');
  useEffect(() => { if (!token) return; Promise.all([api.getCommunityMember(token, user!.id), api.getCommunityPreferences(token)]).then(([m, p]) => { setProfile({ headline: m.communityProfile?.headline || '', bio: m.communityProfile?.bio || '', expertise: (m.communityProfile?.expertise || []).join(', '), goals: (m.communityProfile?.goals || []).join(', '), visibility: m.communityProfile?.visibility || 'MEMBERS_ONLY' }); setPrefs(p); }); }, [token, user?.id]);
  async function save(e: React.FormEvent) { e.preventDefault(); if (!token) return; await Promise.all([api.updateCommunityProfile(token, { ...profile, expertise: profile.expertise.split(',').map((x) => x.trim()).filter(Boolean), goals: profile.goals.split(',').map((x) => x.trim()).filter(Boolean) }), prefs && api.updateCommunityPreferences(token, prefs)]); setNote('Community profile and preferences saved.'); }
  return <main className="min-h-screen bg-cream-50 px-4 py-8"><form onSubmit={save} className="mx-auto max-w-2xl rounded-[2rem] border border-ink-100 bg-white p-7 shadow-sm"><p className="eyebrow text-gold-600">Your presence</p><h1 className="font-display text-3xl font-bold text-ink-900">Community settings</h1>
    {(['headline', 'bio', 'expertise', 'goals'] as const).map((field) => <label key={field} className="mt-5 block text-sm font-semibold capitalize text-ink-700">{field}<textarea rows={field === 'bio' ? 5 : 2} value={profile[field]} onChange={(e) => setProfile({ ...profile, [field]: e.target.value })} className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 font-normal"/></label>)}
    <label className="mt-5 block text-sm font-semibold text-ink-700">Profile visibility<select value={profile.visibility} onChange={(e) => setProfile({ ...profile, visibility: e.target.value })} className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 font-normal"><option value="PUBLIC">Public</option><option value="MEMBERS_ONLY">Members only</option><option value="HIDDEN">Hidden</option></select></label>
    {prefs && <fieldset className="mt-7 border-t border-ink-100 pt-5"><legend className="font-display text-xl font-semibold">Notifications</legend>{[['replyEnabled','Replies'],['mentionEnabled','Mentions'],['reminderEmail','Event reminders'],['digestEmail','Weekly digest']].map(([key,label]) => <label key={key} className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={!!prefs[key]} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}/>{label}</label>)}</fieldset>}
    {note && <p className="mt-5 text-sm text-forest-700">{note}</p>}<button className="mt-6 rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-white">Save settings</button>
  </form></main>;
}
