'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityRichContent } from '@/components/community/rich-content';

export default function CommunityCoursesPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getCourses(token), api.getMyCourseCertificates(token)])
      .then(([courseList, certificateList]) => {
        setCourses(courseList);
        setCertificates(certificateList);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-600">
            Learning hub
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">
            Build skills that move your work forward.
          </h1>
          <p className="mt-3 text-ink-600">
            Practical courses, downloadable resources, and lesson conversations—tracked in one
            place.
          </p>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-ink-500">Loading courses…</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const progress = course.lessonCount
                ? Math.round((course.completedCount / course.lessonCount) * 100)
                : 0;
              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm"
                >
                  <div className="aspect-[16/8] bg-forest-900">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-end p-5 text-cream-100">
                        <span className="font-display text-2xl font-semibold">CreatorPlus</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
                      <span>{course.lessonCount} lessons</span>
                      <span>{course.accessLevel === 'PREMIUM' ? 'Premium' : 'Included'}</span>
                    </div>
                    <h2 className="mt-2 font-display text-xl font-bold text-ink-900">
                      {course.title}
                    </h2>
                    {course.description && (
                      <div className="mt-2 line-clamp-3 text-sm text-ink-600">
                        <CommunityRichContent
                          body={course.description}
                          format={course.descriptionFormat}
                        />
                      </div>
                    )}
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-cream-200">
                      <div
                        className="h-full rounded-full bg-clay-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                      <span>{progress}% complete</span>
                      <span>
                        {course.completedCount}/{course.lessonCount}
                      </span>
                    </div>
                    {course.locked ? (
                      <Link
                        href={'/community/join' as Route}
                        className="mt-5 block rounded-full border border-ink-200 px-4 py-2 text-center text-sm font-semibold text-ink-700"
                      >
                        Unlock premium course
                      </Link>
                    ) : (
                      <Link
                        href={`/community/course/${course.slug}` as Route}
                        className="mt-5 block rounded-full bg-forest-800 px-4 py-2 text-center text-sm font-semibold text-cream-50"
                      >
                        {progress ? 'Continue learning' : 'Start course'}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {certificates.length > 0 && (
          <section className="mt-12 border-t border-ink-100 pt-8">
            <h2 className="font-display text-2xl font-bold text-ink-900">Your certificates</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {certificates.map((certificate) => (
                <Link
                  key={certificate.id}
                  href={`/community/certificate/${certificate.verificationId}` as Route}
                  className="rounded-2xl border border-gold-200 bg-gold-50 p-4 hover:border-gold-400"
                >
                  <strong className="text-ink-900">{certificate.course.title}</strong>
                  <p className="mt-1 text-xs text-ink-500">
                    Issued {new Date(certificate.issuedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
