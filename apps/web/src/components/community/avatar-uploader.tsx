'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { MemberAvatar } from '@/components/community/member-avatar';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Profile picture picker: uploads to storage, then points the member's avatar at it. */
export function AvatarUploader() {
  const { token, user, refresh } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const current = preview ?? user?.avatar ?? null;

  async function onPick(file?: File) {
    if (!file || !token) return;
    setError('');
    if (!ACCEPTED.includes(file.type)) return setError('Please choose a JPG, PNG, WebP or GIF image.');
    if (file.size > MAX_BYTES) return setError('Image must be 5 MB or smaller.');
    setBusy(true);
    try {
      const { url } = await api.uploadFile(token, file, 'avatars');
      const res = await api.setMyAvatar(token, url);
      setPreview(res.avatar);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onRemove() {
    if (!token) return;
    setBusy(true);
    try {
      await api.setMyAvatar(token, null);
      setPreview(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 flex items-center gap-4">
      <MemberAvatar name={user?.displayName || user?.email} src={current} size={72} />
      <div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-forest-800 px-4 py-2 text-xs font-semibold text-cream-50 disabled:opacity-60"
          >
            {busy ? 'Uploading…' : current ? 'Change photo' : 'Upload photo'}
          </button>
          {current && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-500">JPG, PNG, WebP or GIF, up to 5 MB.</p>
        {error && <p className="mt-1 text-xs font-medium text-clay-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
