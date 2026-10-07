'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CommunityRichContent } from '@/components/community/rich-content';

function videoEmbed(url?: string | null): string | null {
  if (!url) return null;
  try {
    const iframeSrc = url.match(/src=["']([^"']+)["']/i)?.[1];
    const u = new URL(iframeSrc || url);
    if (u.hostname.includes('youtu.be'))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.hostname.includes('loom.com')) return url.replace('/share/', '/embed/');
    if (u.hostname.includes('wistia.com')) return url;
    if (u.hostname === 'iframe.mediadelivery.net' || u.hostname === 'player.mediadelivery.net')
      return url;
    if (u.hostname.includes('bunny.net')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1] && parts[embedIndex + 2]) {
        return `https://player.mediadelivery.net/embed/${parts[embedIndex + 1]}/${parts[embedIndex + 2]}`;
      }
      const libraryId =
        u.searchParams.get('libraryId') ||
        u.searchParams.get('library') ||
        parts.find((p) => /^\d+$/.test(p));
      const videoId =
        u.searchParams.get('videoId') ||
        u.searchParams.get('video') ||
        parts.find((p) => /^[0-9a-f-]{24,}$/i.test(p));
      if (libraryId && videoId)
        return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push(`/auth/login?redirect=/community/course/${slug}` as Route);
      return;
    }
    if (!token || !slug) return;
    api
      .getCourse(token, slug)
      .then((c) => {
        setCourse(c);
        const lessons = c.modules.flatMap((m: any) => m.lessons);
        const first =
          lessons.find((l: any) => !l.locked && !l.premiumLocked && !l.completed) ||
          lessons.find((l: any) => !l.locked && !l.premiumLocked) ||
          lessons[0];
        setSelectedId(first?.id ?? null);
      })
      .catch((e: any) => {
        setError(e.message || 'Could not load course');
      })
      .finally(() => setLoading(false));
  }, [token, slug, authLoading, router]);

  const lessons = useMemo(
    () => (course ? course.modules.flatMap((m: any) => m.lessons) : []),
    [course],
  );
  const selected = useMemo(
    () => lessons.find((l: any) => l.id === selectedId) ?? null,
    [lessons, selectedId],
  );
  const completedCount = lessons.filter((l: any) => l.completed).length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  async function toggleComplete() {
    if (!token || !selected) return;
    setBusy(true);
    const next = !selected.completed;
    try {
      await api.completeLesson(token, selected.id, next);
      setCourse(await api.getCourse(token, slug));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50">
        <p className="text-sm text-ink-500">Loading…</p>
      </main>
    );
  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <p className="text-sm text-clay-600">{error}</p>
      </main>
    );
  if (!course) return null;

  const embed = videoEmbed(selected?.videoUrl);

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/community" className="text-sm text-ink-500 hover:text-ink-800">
          ← Back to CreatorPlus Community
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-900">{course.title}</h1>
            {course.description && (
              <div className="mt-2 max-w-3xl">
                <CommunityRichContent body={course.description} format={course.descriptionFormat} />
              </div>
            )}
          </div>
          <p className="text-sm text-ink-500">
            {completedCount}/{lessons.length} lessons · {pct}%
          </p>
        </div>

        {course.premiumLocked && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-gold-300 bg-gold-50 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Premium course</p>
              <p className="mt-0.5 text-sm text-ink-700">
                Preview it free. Unlock every lesson, the certificate, and the full QR Studio with CreatorPlus Pro.
              </p>
            </div>
            <Link
              href={'/community/join' as Route}
              className="shrink-0 rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Curriculum */}
          <aside className="space-y-4">
            {course.modules.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{m.title}</p>
                <ul className="mt-2 space-y-1">
                  {m.lessons.map((l: any) => {
                    const isSel = l.id === selectedId;
                    const blocked = l.locked || l.premiumLocked;
                    return (
                      <li key={l.id}>
                        <button
                          disabled={blocked}
                          onClick={() => setSelectedId(l.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${isSel ? 'bg-forest-50 text-forest-900' : 'hover:bg-cream-100'} ${blocked ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${l.completed ? 'bg-forest-600 text-white' : 'border border-ink-300 text-ink-400'}`}
                          >
                            {l.completed ? '✓' : l.premiumLocked ? '✦' : l.locked ? '🔒' : ''}
                          </span>
                          <span className="flex-1">{l.title}</span>
                          {l.isPreview && !l.premiumLocked ? (
                            <span className="rounded-full bg-forest-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-forest-700">Preview</span>
                          ) : l.premiumLocked ? (
                            <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-700">Pro</span>
                          ) : l.locked ? (
                            <span className="text-[10px] text-ink-400">{l.unlocksInDays}d</span>
                          ) : null}
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
            ) : selected.premiumLocked ? (
              <div className="py-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Premium lesson</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">{selected.title}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-600">
                  Upgrade to CreatorPlus Pro to unlock this lesson, every other premium lesson, certificates, and the full QR Studio.
                </p>
                <Link
                  href={'/community/join' as Route}
                  className="mt-5 inline-block rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700"
                >
                  Upgrade to Pro
                </Link>
              </div>
            ) : selected.locked ? (
              <p className="text-sm text-ink-500">
                This lesson unlocks in {selected.unlocksInDays} day(s).
              </p>
            ) : (
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  {selected.title}
                </h2>

                {selected.videoUrl &&
                  (embed ? (
                    <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-ink-100">
                      <iframe
                        src={embed}
                        title={selected.title}
                        className="h-full w-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={selected.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50"
                    >
                      Watch video
                    </a>
                  ))}

                {selected.fileUrl && (
                  <a
                    href={selected.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700"
                  >
                    Open / download resource
                  </a>
                )}

                {selected.body && (
                  <div className="mt-4">
                    <CommunityRichContent body={selected.body} format={selected.bodyFormat} />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
                  <Link
                    href={
                      `/community/discussion?contextType=LESSON&contextId=${selected.id}&title=${encodeURIComponent(selected.title)}` as Route
                    }
                    className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-cream-100"
                  >
                    Ask about this lesson
                  </Link>

                  {!course.premiumLocked && (
                    <button
                      onClick={toggleComplete}
                      disabled={busy}
                      className={`mt-6 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${selected.completed ? 'border border-ink-200 text-ink-700 hover:bg-cream-100' : 'bg-forest-800 text-cream-50 hover:bg-forest-700'}`}
                    >
                      {selected.completed ? 'Completed ✓ — mark incomplete' : 'Mark as complete'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
        {course.certificate && (
          <Link
            href={`/community/certificate/${course.certificate.verificationId}` as Route}
            className="mt-6 block rounded-2xl border border-gold-200 bg-gold-50 p-5 text-center font-semibold text-ink-900"
          >
            Course complete — view your verified certificate
          </Link>
        )}
      </div>
    </main>
  );
}
