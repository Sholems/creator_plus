import Link from 'next/link';

const posts = [
  { title: 'Introducing CreatorPlus', excerpt: 'Our vision for the future of digital product marketplaces and why we built this platform.', date: 'Jan 15, 2025', category: 'Announcement' },
  { title: 'Top 10 Digital Product Trends in 2025', excerpt: 'From AI templates to Notion kits, here are the hottest digital product categories this year.', date: 'Jan 10, 2025', category: 'Trends' },
  { title: 'How to Price Your Digital Products', excerpt: 'A comprehensive guide to pricing strategies for creators at every stage.', date: 'Jan 5, 2025', category: 'Guide' },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
        <p className="mt-4 text-xl text-gray-600">
          News, insights, and stories from the CreatorPlus team
        </p>
      </div>

      <div className="space-y-8">
        {posts.map((post) => (
          <article
            key={post.title}
            className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {post.category}
              </span>
              <span className="text-sm text-gray-500">{post.date}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{post.title}</h2>
            <p className="mt-2 text-gray-600">{post.excerpt}</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
              Read more →
            </span>
          </article>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>More articles coming soon.</p>
      </div>
    </div>
  );
}
