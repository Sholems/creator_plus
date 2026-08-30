'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { PlatformIcon, detectPlatform, PLATFORM_META } from './brand-icons';

/** Downscale/compress an image in the browser before upload (keeps avatars small). */
async function resizeImage(file: File, max = 512): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'avatar') + '.jpg', { type: 'image/jpeg' });
}

export function AvatarUploader({ token, value, onChange }: { token: string; value?: string; onChange: (url: string | undefined) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(file: File | null) {
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const resized = await resizeImage(file);
      const { url } = await api.uploadFile(token, resized, 'qr-avatars');
      onChange(url);
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-ink-200 bg-cream-100 text-ink-300">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="text-xs">Photo</span>}
      </div>
      <div className="text-xs">
        <label className="cursor-pointer rounded-full border border-ink-200 px-3 py-1.5 font-semibold text-ink-700 hover:bg-cream-100">
          {busy ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
        {value && <button type="button" onClick={() => onChange(undefined)} className="ml-2 text-clay-600 hover:underline">Remove</button>}
        {err && <p className="mt-1 text-clay-600">{err}</p>}
      </div>
    </div>
  );
}

export interface MenuItem { name: string; price?: string; description?: string; tags?: string[] }
export interface MenuSection { title: string; items: MenuItem[] }
export interface MenuData { currency: string; sections: MenuSection[] }

export const EMPTY_MENU: MenuData = { currency: 'NGN', sections: [{ title: '', items: [{ name: '' }] }] };

export function MenuEditor({ value, onChange }: { value: MenuData; onChange: (v: MenuData) => void }) {
  const data = value?.sections?.length ? value : EMPTY_MENU;
  const field = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm';

  const setSection = (si: number, patch: Partial<MenuSection>) =>
    onChange({ ...data, sections: data.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const setItem = (si: number, ii: number, patch: Partial<MenuItem>) =>
    setSection(si, { items: data.sections[si].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  const addSection = () => onChange({ ...data, sections: [...data.sections, { title: '', items: [{ name: '' }] }] });
  const removeSection = (si: number) => onChange({ ...data, sections: data.sections.filter((_, i) => i !== si) });
  const addItem = (si: number) => setSection(si, { items: [...data.sections[si].items, { name: '' }] });
  const removeItem = (si: number, ii: number) => setSection(si, { items: data.sections[si].items.filter((_, i) => i !== ii) });

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-ink-600">Currency
        <select className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm" value={data.currency} onChange={(e) => onChange({ ...data, currency: e.target.value })}>
          <option value="NGN">₦ NGN</option>
          <option value="USD">$ USD</option>
          <option value="GHS">₵ GHS</option>
          <option value="KES">KSh KES</option>
        </select>
      </label>

      {data.sections.map((section, si) => (
        <div key={si} className="rounded-xl border border-ink-100 bg-cream-50 p-3">
          <div className="flex items-center gap-2">
            <input className={`${field} font-semibold`} value={section.title} onChange={(e) => setSection(si, { title: e.target.value })} placeholder={`Section ${si + 1} (e.g. Mains)`} />
            {data.sections.length > 1 && <button type="button" onClick={() => removeSection(si)} className="shrink-0 text-clay-600 hover:underline" aria-label="Remove section">✕</button>}
          </div>
          <div className="mt-2 space-y-2">
            {section.items.map((item, ii) => (
              <div key={ii} className="rounded-lg border border-ink-100 bg-white p-2">
                <div className="flex items-center gap-2">
                  <input className={field} value={item.name} onChange={(e) => setItem(si, ii, { name: e.target.value })} placeholder="Item name" />
                  <input className="w-28 shrink-0 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm" value={item.price ?? ''} onChange={(e) => setItem(si, ii, { price: e.target.value })} placeholder="Price" inputMode="decimal" />
                  {section.items.length > 1 && <button type="button" onClick={() => removeItem(si, ii)} className="shrink-0 text-clay-600 hover:underline" aria-label="Remove item">✕</button>}
                </div>
                <input className={`${field} mt-2`} value={item.description ?? ''} onChange={(e) => setItem(si, ii, { description: e.target.value })} placeholder="Description (optional)" />
                <input className={`${field} mt-2`} value={(item.tags ?? []).join(', ')} onChange={(e) => setItem(si, ii, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="Tags, comma-separated (e.g. Popular, Vegan)" />
              </div>
            ))}
            <button type="button" onClick={() => addItem(si)} className="text-xs font-semibold text-forest-700 hover:underline">+ Add item</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addSection} className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100">+ Add section</button>
    </div>
  );
}

export function SocialLinksEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const links = value.length ? value : [''];
  const update = (i: number, v: string) => onChange(links.map((l, idx) => (idx === i ? v : l)));
  const add = () => onChange([...links, '']);
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {links.map((link, i) => {
        const platform = link.trim() ? detectPlatform(link) : null;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-100 bg-white">
              {platform ? <PlatformIcon platform={platform} size={18} /> : <span className="text-xs text-ink-300">?</span>}
            </span>
            <input
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
              value={link}
              onChange={(e) => update(i, e.target.value)}
              placeholder="https://instagram.com/you"
            />
            {links.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-clay-600 hover:underline" aria-label="Remove">✕</button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="text-xs font-semibold text-forest-700 hover:underline">+ Add social link</button>
      {value.some((v) => v.trim()) && (
        <p className="text-xs text-ink-400">
          Detected: {[...new Set(value.filter((v) => v.trim()).map((v) => PLATFORM_META[detectPlatform(v)].label))].join(', ')}
        </p>
      )}
    </div>
  );
}
