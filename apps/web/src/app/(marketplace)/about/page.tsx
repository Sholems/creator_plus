import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900">About CreatorPlus</h1>
        <p className="mt-4 text-xl text-gray-600">
          The marketplace where digital creators thrive
        </p>
      </div>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          CreatorPlus was built to solve a simple problem: talented creators deserve a better way to sell their digital products, and buyers deserve a trustworthy place to discover high-quality assets.
        </p>
        <p className="text-gray-600 leading-relaxed">
          We handle the infrastructure — payments, file delivery, licensing, analytics — so creators can focus on what they do best: creating.
        </p>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">What We Believe</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-lg font-semibold text-gray-900">Creators Come First</h3>
            <p className="mt-2 text-sm text-gray-600">
              Every feature we build starts with the question: does this make life easier for creators? From instant payouts to detailed analytics, we design for the people who make this marketplace possible.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-lg font-semibold text-gray-900">Trust & Quality</h3>
            <p className="mt-2 text-sm text-gray-600">
              Every product goes through a review process. We maintain strict quality standards so buyers can purchase with confidence, knowing every asset has been vetted.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-gray-900">Fair Revenue Share</h3>
            <p className="mt-2 text-sm text-gray-600">
              Creators keep 90% of every sale. Our 10% platform fee covers payment processing, hosting, file delivery, and customer support. No hidden fees.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl mb-3">🌍</div>
            <h3 className="text-lg font-semibold text-gray-900">Global Community</h3>
            <p className="mt-2 text-sm text-gray-600">
              We serve creators and buyers worldwide. Multi-currency support, localized content, and a growing community of digital professionals.
            </p>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="mb-16 rounded-2xl bg-gray-900 p-8 text-white sm:p-12">
        <h2 className="text-2xl font-bold mb-8 text-center">By the Numbers</h2>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold">14</div>
            <div className="mt-1 text-sm text-gray-400">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">90%</div>
            <div className="mt-1 text-sm text-gray-400">Creator Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">30 Day</div>
            <div className="mt-1 text-sm text-gray-400">Money Back</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">24/7</div>
            <div className="mt-1 text-sm text-gray-400">Support</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
        <p className="text-gray-600 mb-8">
          Whether you&apos;re looking to buy digital assets or sell your creations, we&apos;re here to help you succeed.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Browse Products
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            Start Selling
          </Link>
        </div>
      </section>
    </div>
  );
}
