import Link from 'next/link';

export default function DmcaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">DMCA Policy</span>
      </nav>

      <h1 className="text-4xl font-bold text-gray-900 mb-4">DMCA Takedown Policy</h1>
      <p className="text-sm text-gray-500 mb-12">Last updated: January 1, 2025</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Reporting Infringement</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            CreatorPlus respects the intellectual property of others and expects our users to do the same. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please submit a DMCA takedown notice.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How to File a DMCA Notice</h2>
          <p className="text-gray-600 mb-4">
            Send a written notice to our designated DMCA agent containing:
          </p>
          <ol className="list-decimal list-inside text-gray-600 space-y-3 ml-4">
            <li>A physical or electronic signature of the copyright owner or authorized agent</li>
            <li>Identification of the copyrighted work claimed to be infringed</li>
            <li>Identification of the infringing material and its location on the Platform</li>
            <li>Your contact information (name, address, phone, email)</li>
            <li>A statement that you have a good faith belief the use is not authorized</li>
            <li>A statement, under penalty of perjury, that the information is accurate and you are authorized to act</li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">DMCA Agent Contact</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>Email:</strong> dmca@mycreatorplus.com</p>
            <p><strong>Subject Line:</strong> DMCA Takedown Request</p>
            <p><strong>Response Time:</strong> We aim to respond within 24-48 hours</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Counter-Notification</h2>
          <p className="text-gray-600 leading-relaxed">
            If your content was removed and you believe it was a mistake or that you have the right to use it, you may file a counter-notification. Include your name, contact information, identification of the removed material, and a statement under penalty of perjury that you believe the removal was erroneous.
          </p>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Repeat Infringers</h2>
          <p className="text-gray-600">
            CreatorPlus maintains a policy of terminating the accounts of users who are determined to be repeat infringers. We may also limit access to the Platform for users who infringe intellectual property rights.
          </p>
        </section>

        <div className="text-center text-sm text-gray-500 pt-4">
          <p>
            Questions about our DMCA policy?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
