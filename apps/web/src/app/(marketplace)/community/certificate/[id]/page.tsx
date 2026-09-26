'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function CertificateVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api
      .verifyCourseCertificate(id)
      .then(setCertificate)
      .catch(() => setError('This certificate could not be verified.'));
  }, [id]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-forest-950 px-4 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-gold-300/40 bg-cream-50 p-8 text-center shadow-2xl md:p-14">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay-600">
          Bold Ideas Growth Club
        </p>
        {error ? (
          <p className="mt-8 text-clay-700">{error}</p>
        ) : !certificate ? (
          <p className="mt-8 text-ink-500">Verifying…</p>
        ) : (
          <>
            <p className="mt-10 font-display text-xl text-ink-600">Certificate of completion</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-ink-950">
              {certificate.user.displayName || 'Growth Club member'}
            </h1>
            <p className="mt-5 text-ink-600">has completed</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900">
              {certificate.course.title}
            </h2>
            <div className="mx-auto mt-10 h-px max-w-md bg-gold-300" />
            <p className="mt-5 text-xs text-ink-500">
              Issued {new Date(certificate.issuedAt).toLocaleDateString()} · Verification{' '}
              {certificate.verificationId}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
