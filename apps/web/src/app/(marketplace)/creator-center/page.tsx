import Link from 'next/link';
import type { Route } from 'next';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';

const STEPS: { num: string; title: string; description: string; link: Route | null; linkText: string | null }[] = [
  { num: '1', title: 'Create Your Store', description: 'Sign up and set up your creator profile with a store name and bio. This is your brand on CreatorPlus.', link: '/sell', linkText: 'Create Store' },
  { num: '2', title: 'Upload Your First Product', description: 'Add your digital product with a compelling title, detailed description, thumbnail, and the actual files buyers will download.', link: '/creator/products/new', linkText: 'Create Product' },
  { num: '3', title: 'Get Approved', description: 'Our team reviews every product for quality and compliance. Most reviews are completed within 24–48 hours.', link: null, linkText: null },
  { num: '4', title: 'Start Earning', description: 'Once approved, your product goes live. Share your store link and start earning from every sale.', link: '/creator', linkText: 'View Dashboard' },
];

const RESOURCES: { title: string; description: string; link: Route }[] = [
  { title: 'Licensing Guide', description: 'Understand the different license types and how to set them for your products.', link: '/licensing' },
  { title: 'Pricing Calculator', description: 'See how much you\'ll earn with our 90/10 revenue split.', link: '/pricing' },
  { title: 'Terms of Service', description: 'Review our creator terms and content policies.', link: '/terms' },
  { title: 'Contact Support', description: 'Get help from our creator support team.', link: '/contact' },
];

export default function CreatorCenterPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-16 text-center">
        <AdinkraMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-900">Creator Center</h1>
        <p className="mt-4 text-lg text-ink-500">
          Everything you need to succeed as a digital creator on CreatorPlus
        </p>
      </div>

      {/* Getting Started */}
      <section className="mb-16">
        <h2 className="mb-8 font-display text-2xl font-bold text-ink-900">Getting Started</h2>
        <div className="space-y-6">
          {STEPS.map((item) => (
            <div key={item.num} className="flex gap-6 rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-800 font-display text-lg font-bold text-gold-400">
                {item.num}
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1 text-ink-500">{item.description}</p>
                {item.link && (
                  <Link
                    href={item.link}
                    className="mt-3 inline-flex text-sm font-medium text-forest-700 hover:text-forest-600"
                  >
                    {item.linkText} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-16">
        <h2 className="mb-8 font-display text-2xl font-bold text-ink-900">Best Practices</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { title: 'Write Great Descriptions', points: ['Be specific about what\u2019s included', 'List compatible software/tools', 'Include preview screenshots', 'Mention update frequency'] },
            { title: 'Price Competitively', points: ['Research similar products', 'Consider the value you provide', 'Offer multiple license tiers', 'Use sales strategically'] },
            { title: 'Deliver Quality Files', points: ['Well-organized file structure', 'Include documentation/readme', 'Test on multiple devices', 'Provide preview files'] },
            { title: 'Build Your Brand', points: ['Consistent store branding', 'Respond to buyer messages', 'Keep products updated', 'Share your store link'] },
          ].map((card) => (
            <div key={card.title} className="surface-card p-6">
              <h3 className="mb-3 font-display font-semibold text-ink-900">{card.title}</h3>
              <ul className="space-y-2 text-sm text-ink-500">
                {card.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="mb-16">
        <h2 className="mb-8 font-display text-2xl font-bold text-ink-900">Creator Resources</h2>
        <div className="space-y-4">
          {RESOURCES.map((resource) => (
            <Link
              key={resource.title}
              href={resource.link}
              className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 transition-colors hover:border-forest-300 hover:bg-cream-100"
            >
              <div>
                <h3 className="font-medium text-ink-900">{resource.title}</h3>
                <p className="text-sm text-ink-500">{resource.description}</p>
              </div>
              <svg className="ml-4 h-5 w-5 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-forest-900 p-8 text-center text-cream-50 sm:p-12">
        <AdinkraField patternId="adinkra-creator-center" className="text-gold-400/10" />
        <div className="pointer-events-none absolute inset-0 bg-forest-900/60" />
        <div className="relative">
          <h2 className="font-display text-2xl font-bold">Ready to start selling?</h2>
          <p className="mt-3 text-cream-200">
            Join African creators already earning on CreatorPlus
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-base font-semibold text-forest-950 shadow-sm transition-colors hover:bg-gold-400"
            >
              Create Your Store
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-cream-50/30 px-6 py-3 text-base font-semibold text-cream-50 transition-colors hover:bg-cream-50/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
