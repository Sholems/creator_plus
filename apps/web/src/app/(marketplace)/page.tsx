import Link from 'next/link';
import type { Route } from 'next';

const FREE = [
  'Join the community and discussions',
  'Free starter courses',
  '1 free QR code (links, WhatsApp, vCard & more)',
  'Member profile, follows & leaderboard',
];

const PRO = [
  'All premium AI & digital-skill courses',
  'Verifiable certificates on completion',
  'Live sessions, office hours & challenges',
  'Full QR Studio — unlimited codes, file/PDF uploads & the designer',
  'Priority support',
];

const SKILLS = [
  { title: 'AI & Automation', body: 'Prompting, AI tools, and building with AI — practical, project-based.' },
  { title: 'Digital Skills', body: 'Design, no-code, content, marketing and the tools employers pay for.' },
  { title: 'Build in Public', body: 'Ship real projects with a community keeping you accountable.' },
  { title: 'Creator Tools', body: 'Members get a pro QR toolkit to grow and share their work.' },
];

export default function LandingPage() {
  return (
    <main className="bg-cream-50">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-gold-600">CreatorPlus Community</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            Learn AI & in-demand digital skills — together.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-600">
            A worldwide community where you learn by doing. Join free, take starter courses, and go
            premium to unlock every AI and digital-skill course, live sessions, certificates, and the
            full QR Studio.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/register" className="rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700">
              Join free
            </Link>
            <Link href={'/community/join' as Route} className="rounded-full border border-ink-200 bg-white px-7 py-3.5 text-sm font-semibold text-ink-800 transition hover:bg-cream-100">
              See membership
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-400">Free to join · No card required · Upgrade anytime</p>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="px-4 pb-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs Premium */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink-900">Start free. Go premium when you're ready.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-600">
            Everyone gets the community and a taste of the courses. Premium unlocks the full library,
            certificates, live programming, and the complete QR toolkit.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
            <p className="eyebrow text-ink-400">Free</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink-900">Community member</h3>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-forest-600">✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/auth/register" className="mt-7 block rounded-full border border-forest-300 px-5 py-3 text-center text-sm font-semibold text-forest-800 hover:bg-cream-100">
              Join free
            </Link>
          </div>

          <div className="rounded-3xl border-2 border-forest-600 bg-white p-8 shadow-md">
            <p className="eyebrow text-gold-600">Premium · Pro member</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-ink-900">Full access</h3>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-gold-600">★</span>{f}</li>
              ))}
            </ul>
            <Link href={'/community/join' as Route} className="mt-7 block rounded-full bg-forest-800 px-5 py-3 text-center text-sm font-semibold text-cream-50 hover:bg-forest-700">
              See pricing & subscribe
            </Link>
          </div>
        </div>
      </section>

      {/* QR perk highlight */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-forest-900 px-8 py-12 text-center text-cream-50">
          <p className="eyebrow text-gold-400">Member perk</p>
          <h2 className="mt-2 font-display text-3xl font-bold">A pro QR toolkit, included with membership</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-cream-100/80">
            Premium members get the full QR Studio — dynamic QR codes with a visual designer, logos,
            frames, file/PDF uploads, and scan analytics. Learn a skill, then use the tool to grow.
          </p>
          <Link href={'/community/join' as Route} className="mt-6 inline-block rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-forest-900 hover:bg-gold-300">
            Unlock with Pro
          </Link>
        </div>
      </section>
    </main>
  );
}
