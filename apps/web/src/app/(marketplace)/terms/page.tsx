import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Terms of Service</span>
      </nav>

      <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-12">Last updated: January 1, 2025</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            By accessing or using CreatorPlus (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. These terms apply to all users, including buyers, creators, and visitors.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            To access certain features, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your password and account</li>
            <li>Notify us immediately of any unauthorized use</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Creator Terms</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            If you list products on CreatorPlus, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Own or have proper rights to all content you upload</li>
            <li>Ensure your products meet our quality standards</li>
            <li>Provide accurate descriptions and previews</li>
            <li>Respond to buyer inquiries within a reasonable timeframe</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Purchases & Payments</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            All purchases are processed securely through Paystack or Flutterwave (in Naira) and Stripe (for international payments). By purchasing, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Pay all applicable fees at the time of purchase</li>
            <li>Accept that digital products are non-tangible goods</li>
            <li>Understand that refunds are subject to our refund policy</li>
            <li>Not share, redistribute, or resell purchased products</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Fees & Revenue</h2>
          <p className="text-gray-600 leading-relaxed">
            CreatorPlus charges a 10% platform fee on all sales. Payment processing fees (typically 1.5–2.9%) are deducted separately by the payment provider. Creators receive 90% of the sale price after processing fees. Fees are subject to change with 30 days notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Refund Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            Buyers may request a refund within 30 days of purchase if the product is materially different from its description or has significant technical issues. Refund requests are reviewed on a case-by-case basis. Creator earnings from refunded sales will be deducted from future payouts.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
          <p className="text-gray-600 leading-relaxed">
            Creators retain all intellectual property rights to their products. Purchasing a product grants you a license to use it according to the license terms specified by the creator. You do not acquire ownership or copyright of the product itself.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Prohibited Conduct</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            You may not:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Upload malware, viruses, or harmful code</li>
            <li>Attempt to hack or disrupt the Platform</li>
            <li>Scrape, crawl, or use automated tools to access the Platform</li>
            <li>Impersonate another user or entity</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
          <p className="text-gray-600 leading-relaxed">
            CreatorPlus is not liable for any indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim. The Platform is provided &quot;as is&quot; without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
          <p className="text-gray-600 leading-relaxed">
            We reserve the right to modify these terms at any time. Material changes will be communicated via email or posted on the Platform at least 30 days before taking effect. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Questions about these Terms? Contact us at{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              support@creatormarket.com
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
