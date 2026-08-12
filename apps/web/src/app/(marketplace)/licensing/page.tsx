import Link from 'next/link';

export default function LicensingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Licensing</span>
      </nav>

      <h1 className="text-4xl font-bold text-gray-900 mb-4">Licensing Guide</h1>
      <p className="text-xl text-gray-600 mb-12">
        Understand what you can and cannot do with products purchased on CreatorPlus.
      </p>

      <div className="space-y-8">
        {/* License Types */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">License Types</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal License</h3>
              <p className="mt-2 text-gray-600">
                Use the product for personal, non-commercial projects. Perfect for personal websites, hobby projects, and learning.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>✓ One end-user (you)</li>
                <li>✓ Personal and non-commercial use</li>
                <li>✓ Modifications allowed</li>
                <li>✗ Cannot be used commercially</li>
                <li>✗ Cannot resell or redistribute</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Commercial License</h3>
              <p className="mt-2 text-gray-600">
                Use the product in commercial projects and for client work. Ideal for freelancers, agencies, and businesses.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>✓ Unlimited commercial use</li>
                <li>✓ Use in client projects</li>
                <li>✓ Modifications allowed</li>
                <li>✗ Cannot resell as a standalone product</li>
                <li>✗ Cannot redistribute the source files</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Extended License</h3>
              <p className="mt-2 text-gray-600">
                Use the product in end products that are sold to multiple users. Best for SaaS, themes, and templates.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>✓ All Commercial License rights</li>
                <li>✓ Use in products sold to end users</li>
                <li>✓ Unlimited end users</li>
                <li>✗ Cannot redistribute source files</li>
              </ul>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Enterprise License</h3>
              <p className="mt-2 text-gray-600">
                For organizations needing team-wide access and maximum flexibility. Includes priority support.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>✓ All Extended License rights</li>
                <li>✓ Unlimited team members</li>
                <li>✓ Priority support</li>
                <li>✓ Custom branding options</li>
              </ul>
            </div>
          </div>
        </section>

        {/* What You Can Do */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">General Rights</h2>
          <p className="text-gray-600 mb-4">All licenses include:</p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Use the product in personal or commercial projects as permitted by the license type</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Create modifications and derivative works</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Receive free updates for the product (if provided by the creator)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Access product support from the creator</span>
            </li>
          </ul>
        </section>

        {/* What You Cannot Do */}
        <section className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restrictions</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>Resell, redistribute, or share the original product files</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>Use the product to create a competing product</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>Claim the original work as your own</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">✗</span>
              <span>Remove or alter attribution or copyright notices</span>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Can I use a purchased product for multiple projects?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Yes, as long as your use falls within the terms of your license type. A single purchase grants one license.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Can I transfer my license to someone else?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Licenses are non-transferable. Each user must purchase their own license.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What if I need a license upgrade?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Contact the creator directly to arrange a license upgrade. They can provide pricing for the difference.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Do updates include new versions?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Free updates are at the creator&apos;s discretion. Some products include lifetime updates, others charge for major version upgrades.
              </p>
            </div>
          </div>
        </section>

        <div className="text-center text-sm text-gray-500">
          <p>
            Still have questions?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
