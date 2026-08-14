import Link from 'next/link';
import { formatNaira } from '@/lib/format';
import { AdinkraField, AdinkraMark } from '@/components/brand/adinkra';
import { CustomerProductCard, type CustomerProduct } from '@/components/market/customer-product-card';
import { SectionHeading } from '@/components/market/section-heading';
import { HeroSearch } from './hero-search';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const CATEGORIES = [
  { name: 'AI & Agents', slug: 'ai', icon: '🤖', blurb: 'Prompts, bots, workflows' },
  { name: 'Design', slug: 'design', icon: '🎨', blurb: 'Templates, kits, fonts' },
  { name: 'Development', slug: 'development', icon: '💻', blurb: 'Boilerplates, scripts, apps' },
  { name: 'Business', slug: 'business', icon: '📊', blurb: 'Plans, contracts, models' },
  { name: 'Education', slug: 'education', icon: '📚', blurb: 'Courses & exam prep' },
  { name: 'Books', slug: 'books', icon: '📖', blurb: 'eBooks & guides' },
  { name: 'Audio', slug: 'audio', icon: '🎵', blurb: 'Beats, music, SFX' },
  { name: 'Video', slug: 'video', icon: '🎬', blurb: 'LUTs, motion, stock' },
  { name: 'Photography', slug: 'photography', icon: '📷', blurb: 'Presets, textures' },
  { name: '3D', slug: '3d', icon: '🧊', blurb: 'Models, CAD, materials' },
  { name: 'Architecture', slug: 'architecture', icon: '🏛️', blurb: 'Plans & renderings' },
  { name: 'Marketing', slug: 'marketing', icon: '📣', blurb: 'SMM kits, funnels, ads' },
  { name: 'Legal', slug: 'legal', icon: '⚖️', blurb: 'NDAs, contracts, policies' },
  { name: 'Church', slug: 'church', icon: '⛪', blurb: 'Sermons, slides, worship' },
];

const PAYMENTS = ['Paystack', 'Flutterwave', 'Stripe', 'Verve', 'Mastercard', 'Visa'];

export default async function HomePage() {
  const [productsRes, picksRes] = await Promise.all([
    getJson('/products?perPage=8'),
    getJson('/affiliates/marketplace?sort=best_selling&perPage=8'),
  ]);

  const featured: CustomerProduct[] = productsRes?.data ?? [];
  const affiliatePicks: CustomerProduct[] = (picksRes?.products ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    thumbnail: p.thumbnail,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    salesCount: p.salesCount,
    category: p.category,
    creator: p.creator,
  }));

  const stallItems = featured.slice(0, 2);
  const tickerItems = featured.slice(0, 8).map((p) => ({
    title: p.title,
    price: formatNaira(p.price),
    kept: formatNaira(Number(p.price) * 0.9),
  }));

  return (
    <div>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-forest-950 text-cream-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,180,58,0.16),transparent_55%)]" />
          <AdinkraField patternId="adinkra-hero" markClassName="text-gold-400" className="text-gold-400/15" />
          <div className="absolute inset-0 bg-forest-950/55" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-forest-950" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* LEFT — the pitch */}
            <div className="min-w-0 max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 eyebrow text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
                Made in Nigeria · Serving Africa · Going global
              </p>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
                Buy &amp; Sell{' '}
                <span className="relative whitespace-normal sm:whitespace-nowrap">
                  <span className="bg-gradient-to-r from-gold-300 to-gold-400 bg-clip-text text-transparent">
                    Digital Products
                  </span>
                  <svg
                    className="absolute -bottom-2 left-0 hidden w-full text-gold-400/70 sm:block"
                    viewBox="0 0 320 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 9C80 3 240 3 318 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                , Templates, Courses &amp; AI Prompts
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-cream-100/80">
                CreatorPlus is the marketplace where creators sell digital products —
                website templates, online courses, AI prompts, design assets and tools —
                and buyers download them instantly. Built for Africa, paid in naira with
                Paystack.
              </p>

              {/* Search the market */}
              <HeroSearch />
            </div>

            {/* RIGHT — the stall collage */}
            <div className="relative mx-auto w-full min-w-0 max-w-md lg:max-w-none">
              <div className="relative">
                {/* Scalloped market-stall awning */}
                <div className="flex overflow-hidden rounded-t-2xl" aria-hidden="true">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 40 26"
                      preserveAspectRatio="none"
                      className={`h-6 flex-1 ${i % 2 === 0 ? 'text-gold-400' : 'text-gold-500'}`}
                    >
                      <path d="M0 0 H40 L20 26 Z" fill="currentColor" />
                    </svg>
                  ))}
                </div>

                {/* Stall counter */}
                <div className="relative rounded-b-2xl border border-forest-700 bg-cream-50 p-5 shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:p-6">
                  <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                    <span className="eyebrow text-ink-500">Now on the market</span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-400">
                      live prices · ₦
                    </span>
                  </div>

                  <div className="mt-5">
                    {stallItems[0] ? (
                      <div className="relative">
                        {stallItems[1] && (
                          <Link
                            href={`/products/${stallItems[1].slug}`}
                            className="absolute inset-x-0 -top-3 hidden -rotate-2 items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 opacity-80 shadow-sm transition hover:rotate-0 hover:opacity-100 sm:flex"
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <img
                              src={stallItems[1].thumbnail || ''}
                              alt=""
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-display text-sm font-semibold text-ink-900">
                                {stallItems[1].title}
                              </p>
                              <p className="price-tag text-sm font-bold text-forest-800">
                                {formatNaira(stallItems[1].price)}
                              </p>
                            </div>
                          </Link>
                        )}
                        <Link
                          href={`/products/${stallItems[0].slug}`}
                          className="group relative flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-[0_8px_24px_rgba(22,33,27,0.12)] transition-transform hover:-translate-y-0.5 sm:gap-4"
                        >
                          <img
                            src={stallItems[0].thumbnail || ''}
                            alt={stallItems[0].title}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="eyebrow text-gold-600">
                              {stallItems[0].category?.name || 'Digital product'}
                            </p>
                            <p className="mt-1 line-clamp-1 font-display text-lg font-semibold text-ink-900 group-hover:text-forest-700">
                              {stallItems[0].title}
                            </p>
                            <p className="mt-1 text-xs text-ink-500">
                              {stallItems[0].creator?.storeName}
                              {stallItems[0].creator?.verified && (
                                <span className="ml-1 text-gold-500" title="Verified creator">✓</span>
                              )}
                            </p>
                            <p className="price-tag mt-2 text-lg font-bold text-forest-900">
                              {formatNaira(stallItems[0].price)}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-400">
                        The first stalls open soon.
                      </p>
                    )}
                  </div>

                  {/* Affiliate teaser */}
                  <Link
                    href="/earn"
                    className="absolute -top-5 right-3 inline-flex items-center gap-2 rounded-full bg-forest-800 py-2 pl-3 pr-4 text-xs font-semibold text-cream-50 shadow-lg transition-colors hover:bg-forest-700"
                  >
                    <AdinkraMark className="h-4 w-4 text-gold-300" />
                    Refer &amp; earn up to 50% per sale
                    <span className="text-gold-300">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Just-sold ticker */}
        {tickerItems.length > 0 && (
          <div className="relative border-t border-white/10 bg-forest-950/80 py-3">
            <div className="ticker-track flex w-max items-center gap-10 whitespace-nowrap">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <span key={i} className="flex items-center gap-2 font-mono text-sm text-cream-100/70">
                  <span className="text-gold-400">◆</span>
                  <span className="text-gold-200">{item.title}</span>
                  <span className="text-cream-100/40">just sold ·</span>
                  <span className="text-cream-50">{item.price}</span>
                  <span className="text-cream-100/30">creator kept</span>
                  <span className="text-gold-300">{item.kept}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ================= PAYMENT STRIP ================= */}
      <section className="border-b border-ink-100 bg-cream-50 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 sm:px-6 lg:px-8">
          <span className="eyebrow text-ink-400">Pay and get paid with</span>
          {PAYMENTS.map((p) => (
            <span key={p} className="font-mono text-sm font-semibold tracking-tight text-ink-500">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Walk the market"
            title="Browse by category"
            description="From AI prompt bundles to church sermon packs — every stall is run by a real African maker."
            action={{ href: '/categories', label: 'All categories' }}
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group flex flex-col rounded-2xl border border-ink-100 bg-white p-5 text-center shadow-[0_1px_2px_rgba(22,33,27,0.04)] transition-all hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md"
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">
                  {category.icon}
                </span>
                <span className="mt-3 font-display text-sm font-semibold text-ink-900 group-hover:text-forest-700">
                  {category.name}
                </span>
                <span className="mt-1 text-[0.6875rem] text-ink-400">{category.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED PRODUCTS ================= */}
      <section className="border-y border-ink-100 bg-cream-100/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Fresh from the stalls"
            title="Featured products"
            description="What buyers across Nigeria and Africa are downloading right now."
            action={{ href: '/products', label: 'View all' }}
          />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((product) => (
              <CustomerProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= AFFILIATE PICKS ================= */}
      <section className="relative overflow-hidden bg-forest-900 py-16 text-cream-50 sm:py-20">
        <div className="pointer-events-none absolute inset-0">
          <AdinkraField patternId="adinkra-affiliate-picks" className="text-gold-400/10" />
          <div className="absolute inset-0 bg-forest-900/55" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Loved by our community"
            title="Affiliate picks"
            description="Top products our affiliates love sharing — buy them here, or earn by recommending them to your audience."
            action={{ href: '/earn', label: 'Learn to earn' }}
          />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {affiliatePicks.slice(0, 4).map((product) => (
              <CustomerProductCard key={product.id} product={product} />
            ))}
          </div>
          {affiliatePicks.length > 0 && (
            <p className="mt-8 text-center text-sm text-cream-100/60">
              <Link href="/earn" className="inline-flex items-center gap-1.5 font-semibold text-gold-300 hover:text-gold-200">
                Become an affiliate and earn on every sale
                <span aria-hidden="true">→</span>
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="Two sides of the same market"
            align="center"
            className="sm:items-center"
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Buyers */}
            <div className="surface-card relative overflow-hidden p-8">
              <div className="absolute right-6 top-6 font-mono text-5xl font-bold text-cream-200">
                01
              </div>
              <h3 className="font-display text-xl font-bold text-ink-900">For buyers</h3>
              <div className="mt-6 space-y-5">
                {[
                  { n: '1', t: 'Browse thousands of digital products across 14 categories, priced in naira.' },
                  { n: '2', t: 'Check out securely with Paystack, Flutterwave or card — no dollar card needed.' },
                  { n: '3', t: 'Download instantly and use it under your license, with a 30-day guarantee.' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 font-mono text-sm font-bold text-forest-700">
                      {step.n}
                    </div>
                    <p className="pt-1 text-sm leading-relaxed text-ink-600">{step.t}</p>
                  </div>
                ))}
              </div>
              <Link href="/products" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-600">
                Start shopping <span>→</span>
              </Link>
            </div>

            {/* Creators */}
            <div className="relative overflow-hidden rounded-2xl border border-forest-800 bg-forest-900 p-8 text-cream-50">
              <div className="pointer-events-none absolute inset-0">
                <AdinkraField patternId="adinkra-how-creators" className="text-gold-400/10" />
                <div className="absolute inset-0 bg-forest-900/60" />
              </div>
              <div className="relative">
                <div className="absolute right-6 top-6 font-mono text-5xl font-bold text-white/10">
                  02
                </div>
                <h3 className="font-display text-xl font-bold text-white">For creators</h3>
                <div className="mt-6 space-y-5">
                  {[
                    { n: '1', t: 'Open your free store in under a minute — no subscription, no hidden fees.' },
                    { n: '2', t: 'Upload your work with files, previews and descriptions; we moderate for safety.' },
                    { n: '3', t: 'Keep 90% of every sale and withdraw to any Nigerian bank in naira.' },
                  ].map((step) => (
                    <div key={step.n} className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/20 font-mono text-sm font-bold text-gold-300">
                        {step.n}
                      </div>
                      <p className="pt-1 text-sm leading-relaxed text-cream-100/80">{step.t}</p>
                    </div>
                  ))}
                </div>
                <Link href="/sell" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300 hover:text-gold-200">
                  Start selling <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section className="border-t border-ink-100 bg-cream-100/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: '🔒', title: 'Secure local payments', text: 'Processed by Paystack and Flutterwave with industry-standard encryption — pay from any Nigerian card or bank.' },
              { icon: '⚡', title: 'Instant delivery', text: 'Files arrive the moment your payment confirms. No waiting, no email chasing, no stress.' },
              { icon: '🛡️', title: 'Buyer protection', text: '30-day money-back guarantee on every purchase, and every product is reviewed before it goes live.' },
            ].map((item) => (
              <div key={item.title} className="surface-card flex items-start gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-xl">
                  {item.icon}
                </span>
                <div>
                  <h3 className="font-display font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden bg-forest-900 py-20">
        <div className="pointer-events-none absolute inset-0">
          <AdinkraField patternId="adinkra-cta" className="text-gold-400/10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,180,58,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-forest-900/60" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="eyebrow text-gold-300">Your work deserves a market</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Set up your store today — sell from tomorrow.
          </h2>
          <p className="mt-5 text-lg text-cream-100/75">
            Join thousands of creators across Nigeria and Africa earning money
            from what they already make. Keep 90% of every sale, paid out in naira.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-full bg-gold-400 px-7 py-3.5 font-semibold text-forest-950 shadow-lg transition-colors hover:bg-gold-300"
            >
              Create your store
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3.5 font-semibold text-cream-50 transition-colors hover:border-gold-300 hover:text-gold-300"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-6 font-mono text-xs text-cream-100/50">
            Free to start · 10% commission only when you make a sale
          </p>
        </div>
      </section>
    </div>
  );
}
