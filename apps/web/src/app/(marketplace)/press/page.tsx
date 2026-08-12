import Link from 'next/link';

export default function PressPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Press</h1>
        <p className="mt-4 text-xl text-gray-600">
          Media resources and press information
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">About CreatorPlus</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            CreatorPlus is a digital product marketplace that connects creators with buyers worldwide. Founded in 2024, the platform enables creators to sell digital assets — from templates and code to education and AI tools — with a creator-friendly 90/10 revenue split.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 mt-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">14</div>
              <div className="text-sm text-gray-500">Categories</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">90%</div>
              <div className="text-sm text-gray-500">Creator Revenue</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">Global</div>
              <div className="text-sm text-gray-500">Marketplace</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Press Kit</h2>
          <p className="text-gray-600 mb-4">
            Download our logo and brand assets for use in articles and media coverage.
          </p>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Download Press Kit
          </button>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Press Contact</h2>
          <p className="text-gray-600">
            For press inquiries, interviews, or media requests, contact us at{' '}
            <a href="mailto:press@creatormarket.com" className="text-blue-600 hover:text-blue-700">
              press@creatormarket.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
