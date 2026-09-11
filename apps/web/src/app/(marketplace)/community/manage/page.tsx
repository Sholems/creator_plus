'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const input = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm';
const CONTENT_TYPES = ['TEXT', 'VIDEO', 'FILE'] as const;

type LessonDraft = {
  id?: string;
  moduleId: string;
  title: string;
  contentType: (typeof CONTENT_TYPES)[number];
  body?: string;
  videoUrl?: string;
  fileUrl?: string;
  dripDelayDays?: number;
};

export default function CommunityManagePage() {
  const { token, user } = useAuth();
  const isAdmin = !!user?.roles?.some((r) => r === 'super_admin' || r === 'admin');

  const [courses, setCourses] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refreshList() {
    if (!token) return;
    setCourses(await api.adminListCourses(token));
  }
  async function openCourse(id: string) {
    if (!token) return;
    setDraft(null);
    setSelected(await api.adminGetCourse(token, id));
  }

  useEffect(() => { if (token) refreshList().catch(() => {}); }, [token]);

  if (!token) return <main className="flex min-h-screen items-center justify-center bg-cream-50"><p className="text-sm text-ink-500">Sign in…</p></main>;
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <p className="text-sm text-ink-600">You don't have access to manage the community.</p>
      </main>
    );
  }

  async function run(fn: () => Promise<any>) {
    setBusy(true); setError('');
    try { await fn(); } catch (e: any) { setError(e.message || 'Something went wrong'); } finally { setBusy(false); }
  }

  async function createCourse() {
    if (!newTitle.trim()) return;
    await run(async () => {
      const c = await api.createCourse(token!, { title: newTitle.trim() });
      setNewTitle('');
      await refreshList();
      await openCourse(c.id);
    });
  }

  async function saveCourseField(patch: any) {
    await run(async () => { await api.updateCourse(token!, selected.id, patch); await openCourse(selected.id); await refreshList(); });
  }

  async function uploadCover(file: File) {
    await run(async () => {
      const { url } = await api.uploadFile(token!, file, 'community');
      await api.updateCourse(token!, selected.id, { coverImage: url });
      await openCourse(selected.id);
    });
  }

  async function addModule() {
    if (!moduleTitle.trim()) return;
    await run(async () => { await api.addCourseModule(token!, selected.id, { title: moduleTitle.trim() }); setModuleTitle(''); await openCourse(selected.id); });
  }

  async function saveLesson() {
    if (!draft || !draft.title.trim()) return;
    await run(async () => {
      const payload: any = {
        title: draft.title.trim(),
        contentType: draft.contentType,
        body: draft.contentType === 'TEXT' ? draft.body ?? '' : undefined,
        videoUrl: draft.contentType === 'VIDEO' ? draft.videoUrl ?? '' : undefined,
        fileUrl: draft.contentType === 'FILE' ? draft.fileUrl ?? '' : undefined,
        dripDelayDays: Number(draft.dripDelayDays) || 0,
      };
      if (draft.id) await api.updateLesson(token!, draft.id, payload);
      else await api.addLesson(token!, draft.moduleId, payload);
      setDraft(null);
      await openCourse(selected.id);
    });
  }

  async function uploadLessonFile(file: File) {
    await run(async () => {
      const { url } = await api.uploadFile(token!, file, 'community');
      setDraft((d) => (d ? { ...d, fileUrl: url } : d));
    });
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-gold-600">Manage</p>
            <h1 className="font-display text-3xl font-bold text-ink-900">Community classroom</h1>
          </div>
          <Link href="/community" className="text-sm text-ink-500 hover:text-ink-800">← Community</Link>
        </div>
        {error && <p className="mt-3 rounded-lg bg-clay-50 px-3 py-2 text-sm text-clay-700">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Course list */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-ink-800">New course</p>
              <input className={`${input} mt-2`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Course title" />
              <button onClick={createCourse} disabled={busy} className="mt-2 w-full rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50">Create</button>
            </div>
            <div className="space-y-1">
              {courses.map((c) => (
                <button key={c.id} onClick={() => openCourse(c.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected?.id === c.id ? 'bg-forest-50 text-forest-900' : 'bg-white hover:bg-cream-100'}`}>
                  <span className="truncate">{c.title}</span>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.published ? 'bg-forest-100 text-forest-800' : 'bg-cream-200 text-ink-500'}`}>{c.published ? 'Live' : 'Draft'}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Editor */}
          <section className="space-y-5">
            {!selected ? (
              <p className="rounded-2xl border border-ink-100 bg-white p-6 text-sm text-ink-500 shadow-sm">Select or create a course to edit.</p>
            ) : (
              <>
                {/* Course settings */}
                <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={input} defaultValue={selected.title} onBlur={(e) => e.target.value.trim() && e.target.value !== selected.title && saveCourseField({ title: e.target.value.trim() })} placeholder="Title" />
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input type="checkbox" checked={selected.published} onChange={(e) => saveCourseField({ published: e.target.checked })} /> Published (visible to members)
                    </label>
                    <textarea className={`${input} sm:col-span-2`} rows={2} defaultValue={selected.description ?? ''} onBlur={(e) => e.target.value !== (selected.description ?? '') && saveCourseField({ description: e.target.value })} placeholder="Short description" />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {selected.coverImage && <img src={selected.coverImage} alt="" className="h-14 w-24 rounded-lg object-cover" />}
                    <label className="cursor-pointer rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">
                      {selected.coverImage ? 'Change cover' : 'Upload cover'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                    </label>
                    <button onClick={() => run(async () => { if (confirm('Delete this course?')) { await api.deleteCourse(token!, selected.id); setSelected(null); await refreshList(); } })} className="ml-auto text-xs font-semibold text-clay-600 hover:underline">Delete course</button>
                  </div>
                </div>

                {/* Modules + lessons */}
                {selected.modules.map((m: any) => (
                  <div key={m.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <input className="rounded-lg border border-transparent px-1 text-base font-semibold text-ink-900 hover:border-ink-200" defaultValue={m.title} onBlur={(e) => e.target.value.trim() && e.target.value !== m.title && run(async () => { await api.updateCourseModule(token!, m.id, { title: e.target.value.trim() }); await openCourse(selected.id); })} />
                      <button onClick={() => run(async () => { if (confirm('Delete module and its lessons?')) { await api.deleteCourseModule(token!, m.id); await openCourse(selected.id); } })} className="text-xs font-semibold text-clay-600 hover:underline">Delete</button>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {m.lessons.map((l: any) => (
                        <li key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-cream-100">
                          <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">{l.contentType}</span>
                          <span className="flex-1 truncate">{l.title}</span>
                          {l.dripDelayDays > 0 && <span className="text-[10px] text-ink-400">drip {l.dripDelayDays}d</span>}
                          <button onClick={() => setDraft({ id: l.id, moduleId: m.id, title: l.title, contentType: l.contentType, body: l.body ?? '', videoUrl: l.videoUrl ?? '', fileUrl: l.fileUrl ?? '', dripDelayDays: l.dripDelayDays })} className="text-xs font-semibold text-forest-700 hover:underline">Edit</button>
                          <button onClick={() => run(async () => { await api.deleteLesson(token!, l.id); await openCourse(selected.id); })} className="text-xs font-semibold text-clay-600 hover:underline">✕</button>
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setDraft({ moduleId: m.id, title: '', contentType: 'TEXT', dripDelayDays: 0 })} className="mt-2 text-xs font-semibold text-forest-700 hover:underline">+ Add lesson</button>
                  </div>
                ))}

                {/* Add module */}
                <div className="flex gap-2">
                  <input className={input} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="New module title (e.g. Week 1)" />
                  <button onClick={addModule} disabled={busy} className="shrink-0 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-50">Add module</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Lesson editor panel */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={() => setDraft(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-ink-900">{draft.id ? 'Edit lesson' : 'New lesson'}</h3>
            <div className="mt-4 space-y-3">
              <input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Lesson title" />
              <div className="flex gap-2">
                <select className={input} value={draft.contentType} onChange={(e) => setDraft({ ...draft, contentType: e.target.value as any })}>
                  {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" min={0} className="w-40 rounded-lg border border-ink-200 px-3 py-2 text-sm" value={draft.dripDelayDays ?? 0} onChange={(e) => setDraft({ ...draft, dripDelayDays: Number(e.target.value) })} placeholder="Drip days" />
              </div>
              {draft.contentType === 'TEXT' && (
                <textarea className={input} rows={6} value={draft.body ?? ''} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Lesson text" />
              )}
              {draft.contentType === 'VIDEO' && (
                <input className={input} value={draft.videoUrl ?? ''} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} placeholder="YouTube / Vimeo / Loom URL" />
              )}
              {draft.contentType === 'FILE' && (
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">
                    {draft.fileUrl ? 'Change file' : 'Upload file'}
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLessonFile(e.target.files[0])} />
                  </label>
                  {draft.fileUrl && <span className="truncate text-xs text-ink-500">{draft.fileUrl.split('/').pop()}</span>}
                </div>
              )}
              <p className="text-xs text-ink-400">Drip days: hidden until this many days after a member joins (0 = available immediately).</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDraft(null)} className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-cream-100">Cancel</button>
              <button onClick={saveLesson} disabled={busy} className="rounded-full bg-forest-800 px-5 py-2 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50">{draft.id ? 'Save' : 'Add lesson'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
