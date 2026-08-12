import Link from 'next/link';

export default function PartnershipsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Partnerships</h1>
        <p className="mt-4 text-xl text-gray-600">
          Grow together with CreatorPlus
        </p>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Partner With Us</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            We&apos;re always looking for strategic partnerships that enhance the creator experience. Whether you&apos;re an education platform, software tool, or complementary marketplace, let&apos;s explore how we can work together.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: '🤝', title: 'Integration Partners', description: 'Connect your tools and services with our creator ecosystem.' },
              { icon: '📢', title: 'Co-Marketing', description: 'Reach our growing audience of creators and digital product buyers.' },
              { icon: '🏫', title: 'Education Partners', description: 'Provide learning resources and courses for our creator community.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Partners</h2>
          <p className="text-gray-600 mb-6">
            We&apos;re building partnerships with leading platforms in the digital product space.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {['Paystack', 'Flutterwave', 'Interswitch'].map((partner) => (
              <div key={partner} className="flex items-center justify-center rounded-lg border border-gray-200 p-4">
                <span className="text-lg font-semibold text-gray-400">{partner}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gray-900 p-8 text-center text-white">
          <h2 className="text-xl font-bold">Interested in Partnering?</h2>
          <p className="mt-2 text-gray-400">
            Let&apos;s discuss how we can create value together.
          </p>
          <a
            href="mailto:partnerships@creatormarket.com"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
          >
            Contact Us
          </a>
        </section>
      </div>
    </div>
  );
}
