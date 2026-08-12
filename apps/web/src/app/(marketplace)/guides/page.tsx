import Link from 'next/link';

const guides = [
  { title: 'Getting Started as a Creator', description: 'Set up your store, upload your first product, and make your first sale.', category: 'Beginner' },
  { title: 'Writing Product Descriptions', description: 'Craft compelling descriptions that convert browsers into buyers.', category: 'Marketing' },
  { title: 'Pricing Your Digital Products', description: 'Strategies for finding the right price point for your products.', category: 'Business' },
  { title: 'File Formats & Delivery', description: 'Best practices for packaging and delivering digital files.', category: 'Technical' },
  { title: 'Understanding Licenses', description: 'A deep dive into license types and what they mean for creators and buyers.', category: 'Legal' },
  { title: 'Optimizing Product Images', description: 'Create thumbnails and previews that attract more buyers.', category: 'Design' },
  { title: 'Marketing Your Products', description: 'Drive traffic to your store with social media and SEO.', category: 'Marketing' },
  { title: 'Handling Customer Support', description: 'Respond to buyer inquiries and handle issues professionally.', category: 'Business' },
];

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Creator Guides</h1>
        <p className="mt-4 text-xl text-gray-600">
          Tips, tutorials, and best practices for selling digital products
        </p>
      </div>

      <div className="space-y-4">
        {guides.map((guide) => (
          <div
            key={guide.title}
            className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 mb-2">
                  {guide.category}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">{guide.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{guide.description}</p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-gray-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-gray-500">
        <p>More guides coming soon. Have a topic suggestion?</p>
        <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
          Let us know →
        </Link>
      </div>
    </div>
  );
}
