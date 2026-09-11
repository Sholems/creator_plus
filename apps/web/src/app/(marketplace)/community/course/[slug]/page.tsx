'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function videoEmbed(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) { const v = u.searchParams.get('v'); return v ? `https://www.youtube.com/embed/${v}` : null; }
    if (u.hostname.includes('vimeo.com')) { const id = u.pathname.split('/').filter(Boolean)[0]; return id ? `https://player.vimeo.com/video/${id}` : null; }
    if (u.hostname.includes('loom.com')) return url.replace('/share/', '/embed/');
    if (u.hostname.includes('wistia.com')) return url;
  } catch { /* ignore */ }
  return null;
}

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !slug) return;
    api.getCourse(token, slug)
      .then((c) => {
        setCourse(c);
        const lessons = c.modules.flatMap((m: any) => m.lessons);
        const first = lessons.find((l: any) => !l.locked && !l.completed) || lessons.find((l: any) => !l.locked) || lessons[0];
        setSelectedId(first?.id ?? null);
      })
      .catch((e) => {
        if (String(e.message || '').toLowerCase().includes('membership')) router.push('/community/join' as Route);
        else setError(e.message || 'Could not load course');
      })
      .finally(() => setLoading(false));
  }, [token, slug, router]);

  const lessons = useMemo(() => (course ? course.modules.flatMap((m: any) => m.lessons) : []), [course]);
  const selected = useMemo(() => lessons.find((l: any) => l.id === selectedId) ?? null, [lessons, selectedId]);
  const completedCount = lessons.filter((l: any) => l.completed).length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  async function toggleComplete() {
    if (!token || !selected) return;
    setBusy(true);
    const next = !selected.completed;
    try {
      await api.completeLesson(token, selected.id, next);
      setCourse((c: any) => ({
        ...c,
        modules: c.modules.map((m: any) => ({
          ...m,
          lessons: m.lessons.map((l: any) => (l.id === selected.id ? { ...l, completed: next } : l)),
        })),
      }));
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-cream-50"><p className="text-sm text-ink-500">Loading…</p></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4"><p className="text-sm text-clay-600">{error}</p></main>;
  if (!course) return null;

  const embed = selected?.contentType === 'VIDEO' ? videoEmbed(selected.videoUrl) : null;

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/community" className="text-sm text-ink-500 hover:text-ink-800">← Back to community</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-ink-900">{course.title}</h1>
          <p className="text-sm text-ink-500">{completedCount}/{lessons.length} lessons · {pct}%</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Curriculum */}
          <aside className="space-y-4">
            {course.modules.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{m.title}</p>
                <ul className="mt-2 space-y-1">
                  {m.lessons.map((l: any) => {
                    const isSel = l.id === selectedId;
                    return (
                      <li key={l.id}>
                        <button
                          disabled={l.locked}
                          onClick={() => setSelectedId(l.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${isSel ? 'bg-forest-50 text-forest-900' : 'hover:bg-cream-100'} ${l.locked ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${l.completed ? 'bg-forest-600 text-white' : 'border border-ink-300 text-ink-400'}`}>
                            {l.completed ? '✓' : l.locked ? '🔒' : ''}
                          </span>
                          <span className="flex-1">{l.title}</span>
                          {l.locked && <span className="text-[10px] text-ink-400">{l.unlocksInDays}d</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          {/* Lesson content */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
            {!selected ? (
              <p className="text-sm text-ink-500">Select a lesson to begin.</p>
            ) : selected.locked ? (
              <p className="text-sm text-ink-500">This lesson unlocks in {selected.unlocksInDays} day(s).</p>
            ) : (
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink-900">{selected.title}</h2>

                {selected.contentType === 'VIDEO' && (
                  embed ? (
                    <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-ink-100">
                      <iframe src={embed} title={selected.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                    </div>
                  ) : (
                    <a href={selected.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50">Watch video</a>
                  )
                )}

                {selected.contentType === 'FILE' && selected.fileUrl && (
                  <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700">
                    Open / download resource
                  </a>
                )}

                {selected.body && (
                  <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-ink-800">{selected.body}</div>
                )}

                <button
                  onClick={toggleComplete}
                  disabled={busy}
                  className={`mt-6 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${selected.completed ? 'border border-ink-200 text-ink-700 hover:bg-cream-100' : 'bg-forest-800 text-cream-50 hover:bg-forest-700'}`}
                >
                  {selected.completed ? 'Completed ✓ — mark incomplete' : 'Mark as complete'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
