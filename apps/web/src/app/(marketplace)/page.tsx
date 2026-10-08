import Link from 'next/link';
import type { Route } from 'next';

const SKILL_TRACKS = [
  {
    title: 'AI & Autonomous Agents',
    badge: 'Popular',
    desc: 'Prompt engineering, workflow automations, custom AI agents, and practical LLM tooling for everyday work.',
    topics: ['Prompt Engineering', 'AI Agents', 'Automation Pipelines', 'LLM Workflows'],
    icon: (
      <svg className="h-6 w-6 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Modern UI/UX & Design',
    badge: 'In-Demand',
    desc: 'Design high-converting web apps and digital experiences using Figma, modern typography, and design systems.',
    topics: ['Figma Mastery', 'Design Systems', 'UX Architecture', 'Responsive Layouts'],
    icon: (
      <svg className="h-6 w-6 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'No-Code & Automation',
    badge: 'High Value',
    desc: 'Build scalable operations, API webhooks, automated client pipelines, and internal tools without writing code.',
    topics: ['Zapier & Make', 'Webhook Architecture', 'CRM Automations', 'Client Portals'],
    icon: (
      <svg className="h-6 w-6 text-clay-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Audience & Monetization',
    badge: 'Growth',
    desc: 'Package your skills, build in public, distribute your work, and establish sustainable digital income.',
    topics: ['Build in Public', 'Content Funnels', 'Offer Creation', 'Distribution'],
    icon: (
      <svg className="h-6 w-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const COMMUNITY_PILLARS = [
  {
    title: 'Project-First Learning',
    desc: 'Skip boring lectures. Every course is packed with real builds and practical exercises you can immediately apply in your work.',
    icon: '⚡',
  },
  {
    title: 'Daily Streak Accountability',
    desc: 'Build an unbreakable learning habit with daily check-ins, onboarding milestones, point badges, and leaderboard tracking.',
    icon: '🔥',
  },
  {
    title: 'Live Mentorship & Sessions',
    desc: 'Participate in interactive office hours, live webinars, code-alongs, and community teardowns with seasoned mentors.',
    icon: '🎙️',
  },
  {
    title: 'Building Challenges & Feedback',
    desc: 'Take on weekly & monthly community challenges. Submit your proof-of-work and receive constructive peer reviews.',
    icon: '🏆',
  },
];

const FREE_PERKS = [
  'Join all open community discussions and ask questions',
  'Access starter courses with playable preview lessons',
  'Personal member profile, followers & reputation score',
  'Daily streak tracking and habit loop point bonuses',
  '1 free dynamic QR code via built-in QR Studio',
  'Weekly community digests and public challenge viewing',
];

const PRO_PERKS = [
  'Complete library access to all premium AI & digital courses',
  'Verifiable completion certificates to share on LinkedIn & CVs',
  'Live interactive office hours, AMAs & masterclasses',
  'Active enrollment and submission in building challenges',
  'Full QR Studio — unlimited dynamic codes with Cloudflare R2 file/PDF hosting',
  'Real-time QR scan analytics and custom designer tools',
  'Distinct Pro Member badge and priority community support',
];

const FAQS = [
  {
    q: 'Is CreatorPlus Community free to join?',
    a: 'Yes! Anyone can sign up for free without a credit card. Free members get full access to community feeds, starter courses, daily streak tracking, member profiles, and 1 basic dynamic QR code.',
  },
  {
    q: 'What is included in Pro Membership?',
    a: 'Pro unlocks our complete library of advanced courses, verified completion certificates, private live masterclasses and office hours, building challenges, and the full QR Studio toolkit (with PDF/file uploads and scan analytics).',
  },
  {
    q: 'How do verifiable certificates work?',
    a: 'When you complete all lessons in an accredited course, CreatorPlus generates a verifiable certificate with a unique public URL. You can showcase it on your LinkedIn profile, portfolio, or resume with one click.',
  },
  {
    q: 'What is QR Studio and why is it included?',
    a: 'QR Studio is our integrated creator growth toolkit. It lets you create custom branded dynamic QR codes to share your links, contact cards, or hosted PDFs/files with detailed scan analytics — perfect for marketing your projects and client work.',
  },
  {
    q: 'What payment methods do you accept for Pro?',
    a: 'We support local Nigerian cards and bank transfers via Paystack (in Naira ₦), pan-African payments via Flutterwave, and international debit/credit cards via Stripe.',
  },
  {
    q: 'Can I learn at my own pace?',
    a: 'Yes. All video courses, lessons, and community discussions are self-paced and available 24/7 on both desktop and mobile devices.',
  },
];

export default function LandingPage() {
  return (
    <main className="bg-cream-50 text-ink-900 selection:bg-gold-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-gradient-to-b from-cream-100/70 via-cream-50 to-cream-50 px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/15 px-3.5 py-1 text-xs font-semibold text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
            <span>The Premier African Creator & Tech Community</span>
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink-900 sm:text-6xl sm:leading-[1.12]">
            Master Practical AI & High-Income Digital Skills — <span className="text-forest-700">Together.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
            A project-driven learning community for creators, builders, and professionals across Nigeria, Africa, and beyond. Learn by doing, build real projects, attend live masterclasses, and grow with peers.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-full bg-forest-900 px-7 py-3.5 text-sm font-semibold text-cream-50 shadow-md transition-all duration-200 hover:bg-forest-800 hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>Join the Community Free</span>
              <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href={'/community/courses' as Route}
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-6 py-3.5 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-ink-300 hover:bg-cream-100"
            >
              <span>Explore Courses</span>
              <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[0.6875rem] font-bold text-gold-800">Preview</span>
            </Link>
          </div>

          <p className="mt-4 text-xs font-medium text-ink-400">
            100% Free to join · No credit card required · Upgrade to Pro anytime
          </p>

          {/* Social Proof & Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 gap-3 border-t border-ink-100 pt-10 sm:grid-cols-4 sm:gap-6">
            <div className="rounded-2xl border border-ink-100 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="font-display text-2xl font-bold text-forest-800 sm:text-3xl">100% Free</p>
              <p className="mt-1 text-xs font-medium text-ink-500">Starter community tier</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="font-display text-2xl font-bold text-gold-600 sm:text-3xl">Project-First</p>
              <p className="mt-1 text-xs font-medium text-ink-500">Practical AI & skill tracks</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="font-display text-2xl font-bold text-forest-800 sm:text-3xl">Daily Streaks</p>
              <p className="mt-1 text-xs font-medium text-ink-500">Habit & accountability loop</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white/70 p-4 shadow-sm backdrop-blur">
              <p className="font-display text-2xl font-bold text-gold-600 sm:text-3xl">Verifiable</p>
              <p className="mt-1 text-xs font-medium text-ink-500">Certificates of completion</p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Pillars */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-gold-600">How You Learn & Grow</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Engineered for Real-World Competence
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
              Online learning is broken when you study alone. CreatorPlus combines hands-on curriculum with daily accountability, live sessions, and peer feedback.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {COMMUNITY_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gold-300 hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-2xl">
                  {pillar.icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink-900 group-hover:text-forest-800">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum Tracks */}
      <section className="border-y border-ink-100 bg-cream-100/50 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-forest-700">Curriculum Tracks</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                What You Will Master
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-600 sm:text-base">
                Curated by industry practitioners to help you build valuable skills and launch digital services.
              </p>
            </div>
            <Link
              href={'/community/courses' as Route}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-800 transition hover:text-gold-600"
            >
              <span>Browse all courses</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SKILL_TRACKS.map((track) => (
              <div key={track.title} className="flex flex-col justify-between rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50">
                      {track.icon}
                    </div>
                    <span className="rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-700 border border-gold-200">
                      {track.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{track.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{track.desc}</p>
                </div>
                <div className="mt-6 border-t border-ink-100 pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {track.topics.map((t) => (
                      <span key={t} className="rounded-md bg-cream-100 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Studio Member Perk Showcase */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-forest-950 p-8 sm:p-12 text-cream-50 shadow-xl border border-white/10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-gold-400/20 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-gold-300">
                Included Creator Tool
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                A Pro QR Toolkit Built Right In
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream-100/80 sm:text-base">
                Community members do not just learn skills — they get the tools to share and grow their work. Use our dynamic QR Studio to host documents, create vCards, launch campaigns, and monitor scans.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-cream-100/90">
                {['Dynamic Link Redirects', 'Cloudflare R2 PDF/File Hosting', 'Custom Colors & Frames', 'Real-time Scan Analytics', 'vCard & WhatsApp QRs'].map((f) => (
                  <span key={f} className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    ✓ {f}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={'/community/join' as Route}
                  className="rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-forest-950 shadow transition hover:bg-gold-300"
                >
                  Unlock Pro Access
                </Link>
                <Link
                  href={'/creator/qr-studio' as Route}
                  className="text-sm font-semibold text-cream-100/80 underline underline-offset-4 hover:text-white"
                >
                  Explore QR Studio →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-forest-900/80 p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gold-400" />
                    <span className="font-mono text-xs font-bold text-cream-100">QR Studio Pro</span>
                  </div>
                  <span className="rounded bg-gold-400/20 px-2 py-0.5 text-[0.625rem] font-bold text-gold-300">MEMBER PERK</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-forest-950/60 p-3 border border-white/10">
                    <p className="text-xs text-cream-100/60">Free Tier</p>
                    <p className="text-sm font-semibold text-white">1 Dynamic QR Code</p>
                    <p className="text-xs text-cream-100/70">Links, WhatsApp, contacts</p>
                  </div>

                  <div className="rounded-xl bg-gold-400/10 p-3 border border-gold-400/30">
                    <p className="text-xs text-gold-300 font-semibold">Pro Membership</p>
                    <p className="text-sm font-bold text-gold-200">Unlimited Dynamic Campaigns</p>
                    <p className="text-xs text-gold-300/80">Hosted PDF/Files on R2 + Scan Analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Membership Comparison */}
      <section className="border-t border-ink-100 bg-cream-100/40 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-gold-600">Membership Tiers</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
            Start Free. Upgrade for Full Mastery.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
            Every registered member gets full community access, starter courses, and habit tracking. Go Pro when you are ready to unlock complete curricula and verifiable certificates.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Free Tier */}
          <div className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500">Free Tier</span>
                <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-700">Forever Free</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">Community Member</h3>
              <p className="mt-2 text-sm text-ink-600">
                Join the conversation, explore free lessons, track daily streaks, and connect with fellow creators.
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold text-ink-900">₦0</span>
                <span className="text-xs text-ink-500">/ forever</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-ink-700">
                {FREE_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/auth/register"
              className="mt-8 block rounded-full border border-forest-300 bg-cream-50 px-5 py-3 text-center text-sm font-semibold text-forest-900 transition hover:bg-forest-50"
            >
              Join Free Today
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-forest-600 bg-white p-8 shadow-lg">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-forest-700 px-4 py-1 font-mono text-xs font-bold uppercase tracking-wider text-gold-300 shadow">
              Most Recommended
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gold-600">Pro Tier</span>
                <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-800">All-Inclusive</span>
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold text-ink-900">Pro Member</h3>
              <p className="mt-2 text-sm text-ink-600">
                Full access to every AI course, verified certificates, live programming, challenges, and pro QR tools.
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-ink-900">Affordable Plans</span>
                <span className="text-xs text-ink-500">(Monthly & Annual)</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-ink-700">
                {PRO_PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">★</span>
                    <span className="font-medium text-ink-900">{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={'/community/join' as Route}
              className="mt-8 block rounded-full bg-forest-900 px-5 py-3 text-center text-sm font-semibold text-cream-50 shadow transition hover:bg-forest-800 hover:shadow-md"
            >
              See Pricing & Upgrade
            </Link>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-gold-600">Questions & Answers</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Everything you need to know about the CreatorPlus Community and membership.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-ink-900 sm:text-lg">{faq.q}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing Call-to-Action Banner */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-forest-900 px-6 py-14 text-center text-cream-50 shadow-xl sm:px-12">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-gold-400">Join Today</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to Build Your Digital Future With Fellow Creators?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream-100/80 sm:text-base">
            Join the community free right now. Start building practical skills, keep yourself accountable with daily streaks, and connect with peers across Africa and the world.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-full bg-gold-400 px-7 py-3.5 text-sm font-semibold text-forest-950 shadow transition hover:bg-gold-300"
            >
              Join the Community — Free
            </Link>
            <Link
              href={'/community/courses' as Route}
              className="rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Browse Course Catalog
            </Link>
          </div>

          <p className="mt-4 text-xs text-cream-100/60">Free forever tier · No credit card required</p>
        </div>
      </section>
    </main>
  );
}
