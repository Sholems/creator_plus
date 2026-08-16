import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Help Center',
  description:
    'Find answers to common questions about buying and selling digital products on CreatorPlus. Payment, downloads, refunds, licensing, and more.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help Center — CreatorPlus',
    description:
      'Find answers to common questions about buying and selling digital products on CreatorPlus.',
    type: 'website',
  },
};

const faqCategories = [
  {
    title: 'Getting Started',
    questions: [
      { q: 'How do I create an account?', a: 'Click "Sign Up" in the top navigation. You can register with your email address and a password. Verify your email to activate your account.' },
      { q: 'How do I buy a product?', a: 'Browse products, click on one you like, and click "Buy Now" or "Add to Cart". You\'ll be taken to our secure checkout — pay with Paystack, Flutterwave or card.' },
      { q: 'What payment methods do you accept?', a: 'Nigerian cards, bank accounts and QR via Paystack; pan-African payments (cards, bank transfer, USSD, mobile money) via Flutterwave; and international cards via Stripe.' },
    ],
  },
  {
    title: 'For Buyers',
    questions: [
      { q: 'How do I download my purchases?', a: 'After payment, you\'ll receive a download link. You can also find all your downloads in your Dashboard under "Downloads". Links are valid for 30 days with up to 10 downloads.' },
      { q: 'Can I get a refund?', a: 'We offer refunds within 30 days of purchase if the product is materially different from its description or has significant technical issues.' },
      { q: 'What license do I get?', a: 'Each product specifies its license type (Personal, Commercial, Extended, or Enterprise). Check the Licensing page for full details on what each license allows.' },
    ],
  },
  {
    title: 'For Creators',
    questions: [
      { q: 'How do I start selling?', a: 'Click "Start Selling" or go to /sell. Create your store, then upload your first product. Products go through a review process before going live.' },
      { q: 'How much can I earn?', a: 'Creators keep 90% of every sale. We charge a 10% platform fee. Payment processing fees are deducted separately by the payment provider.' },
      { q: 'How do I get paid?', a: 'Set up your payout bank account in your store settings. Payouts are processed via Paystack or Flutterwave on a rolling basis once you reach the minimum payout threshold.' },
      { q: 'What file formats are supported?', a: 'You can upload any digital file format. Common formats include ZIP, PDF, PSD, AI, Figma, MP4, MP3, and more. The maximum file size is 500MB per file.' },
      { q: 'How do I track my sales?', a: 'Your Creator Dashboard shows real-time analytics including views, sales, revenue, and conversion rates. Check the Analytics page for detailed insights.' },
    ],
  },
  {
    title: 'Account & Technical',
    questions: [
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page. You\'ll receive an email with a reset link valid for 1 hour.' },
      { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption, never store payment card details (handled by our payment providers), and implement strict access controls. See our Privacy Policy for details.' },
      { q: 'How do I delete my account?', a: 'Contact support at support@mycreatorplus.com to request account deletion. Your data will be removed within 30 days.' },
    ],
  },
];

export default function HelpPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((cat) =>
      cat.questions.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    ),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Help Center</h1>
        <p className="mt-4 text-xl text-gray-600">
          Find answers to common questions
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 mb-12 sm:grid-cols-4">
        <Link href="/about" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="text-2xl mb-2">📖</div>
          <div className="text-sm font-medium text-gray-900">About Us</div>
        </Link>
        <Link href="/contact" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="text-2xl mb-2">✉️</div>
          <div className="text-sm font-medium text-gray-900">Contact</div>
        </Link>
        <Link href="/licensing" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="text-2xl mb-2">📄</div>
          <div className="text-sm font-medium text-gray-900">Licensing</div>
        </Link>
        <Link href="/sell" className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-sm font-medium text-gray-900">Start Selling</div>
        </Link>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {faqCategories.map((category) => (
          <section key={category.title} className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{category.title}</h2>
            <div className="space-y-4">
              {category.questions.map((item, i) => (
                <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <h3 className="font-semibold text-gray-900">{item.q}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Still Need Help */}
      <div className="mt-12 rounded-xl bg-gray-900 p-8 text-center text-white">
        <h2 className="text-xl font-bold">Still need help?</h2>
        <p className="mt-2 text-gray-400">
          Our support team is available 24/7 via email.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
