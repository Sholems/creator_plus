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
