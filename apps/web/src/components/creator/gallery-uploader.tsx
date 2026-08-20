'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * Multi-image gallery uploader for the product form. Uploads each selected
 * image to storage and returns the resulting URLs via onChange. The first
 * image is treated as the cover; images can be reordered and removed.
 */
export function GalleryUploader({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || !token) return;
    setError('');
    const room = max - value.length;
    if (room <= 0) {
      setError(`You can add up to ${max} images.`);
      return;
    }
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, room);
    if (picked.length === 0) {
      setError('Please choose image files.');
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of picked) {
        const res = await api.uploadFile(token, f, 'products');
        if (res?.url) urls.push(res.url);
      }
      onChange([...value, ...urls]);
    } catch (e: any) {
      setError(e.message || 'Some images could not be uploaded');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const moveBy = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-cream-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Gallery image ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-forest-800 px-2 py-0.5 text-[0.625rem] font-semibold text-cream-50">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveBy(i, -1)}
                  disabled={i === 0}
                  aria-label="Move left"
                  className="rounded bg-white/90 px-1.5 text-xs text-ink-800 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveBy(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label="Move right"
                  className="rounded bg-white/90 px-1.5 text-xs text-ink-800 disabled:opacity-40"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="rounded bg-white/90 px-1.5 text-xs font-semibold text-clay-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-200 bg-cream-50 text-ink-400 transition-colors hover:border-forest-400 hover:text-forest-700 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">{uploading ? 'Uploading…' : 'Add images'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="mt-2 text-xs text-ink-400">
        Up to {max} images. The first is the cover; drag order with the arrows. {value.length}/{max} added.
      </p>
      {error && <p className="mt-1 text-xs text-clay-600">{error}</p>}
    </div>
  );
}
