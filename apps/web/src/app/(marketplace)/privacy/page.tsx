import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'CreatorPlus Privacy Policy — how we collect, use, and protect your personal information when you use our marketplace.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — CreatorPlus',
    description:
      'How we collect, use, and protect your personal information when you use CreatorPlus.',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Privacy Policy</span>
      </nav>

      <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-12">Last updated: January 1, 2025</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We collect information you provide directly:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li><strong>Account info:</strong> email, display name, password (hashed)</li>
            <li><strong>Profile info:</strong> avatar, bio, store name</li>
            <li><strong>Payment info:</strong> billing address, payment method (processed by Paystack, Flutterwave or Stripe — we never store card details)</li>
            <li><strong>Creator info:</strong> payout bank account details for Paystack and Flutterwave payouts</li>
            <li><strong>Content:</strong> products, descriptions, files you upload</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We use your information to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Provide, maintain, and improve the Platform</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and security alerts</li>
            <li>Respond to your comments and support requests</li>
            <li>Send marketing communications (with your consent)</li>
            <li>Detect, prevent, and address fraud and abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We do not sell your personal information. We share information only:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>With Paystack, Flutterwave and Stripe for payment processing</li>
            <li>With Cloudflare for file storage and CDN</li>
            <li>When required by law or to protect our rights</li>
            <li>In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
          <p className="text-gray-600 leading-relaxed">
            We implement industry-standard security measures including HTTPS encryption, hashed passwords, and access controls. However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your account information for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, though some information may be retained in backup systems or as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            We use essential cookies to maintain your session and authentication state. We do not use third-party advertising cookies. You can control cookie settings in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
            <li>Access, correct, or delete your personal data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
            <li>Close your account at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            The Platform is not intended for users under 13 years of age. We do not knowingly collect information from children. If we learn that we have collected data from a child, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
          <p className="text-gray-600 leading-relaxed">
            We may update this policy from time to time. Material changes will be communicated via email or posted on the Platform. Your continued use constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Privacy questions? Contact us at{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              privacy@mycreatorplus.com
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
