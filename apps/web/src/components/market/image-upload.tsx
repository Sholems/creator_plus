'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@creatormarket/ui';

interface ImageUploadProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  aspect?: 'logo' | 'banner';
  maxMB?: number;
}

export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  folder = 'creators',
  aspect = 'logo',
  maxMB = 5,
}: ImageUploadProps) {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  const current = preview || value || '';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token) {
      setError('You need to be signed in to upload.');
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Image must be under ${maxMB}MB.`);
      return;
    }
    setError('');
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    try {
      const { url } = await api.uploadFile(token, file, folder);
      onChange(url);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setPreview('');
    }
  };

  const remove = () => {
    onChange('');
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const boxClass =
    aspect === 'logo'
      ? 'h-28 w-28 shrink-0 rounded-full'
      : 'h-32 w-full rounded-xl';

  return (
    <div>
      <p className="text-sm font-semibold text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}

      <div className="mt-2.5 flex items-start gap-4">
        <div
          className={cn(
            'relative overflow-hidden border border-ink-100 bg-cream-50',
            boxClass,
            !current && 'border-dashed border-ink-200',
          )}
        >
          {current ? (
            <img src={current} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300">
              <svg className={aspect === 'logo' ? 'h-8 w-8' : 'h-10 w-10'} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21zM12 7.5h.008v.008H12V7.5z" />
              </svg>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-900/40">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">
                Uploading…
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {current ? 'Replace' : 'Upload'}
          </button>
          {current && (
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="text-xs font-medium text-clay-600 transition-colors hover:text-clay-700 disabled:opacity-50"
            >
              Remove
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          {error && <p className="text-xs text-clay-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
